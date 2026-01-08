import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CapgoLLM } from '@capgo/capacitor-llm';
import { Bean } from '../../classes/bean/bean';
import { IBeanInformation } from '../../interfaces/bean/iBeanInformation';
import { UILog } from '../uiLog';
import { UIAlert } from '../uiAlert';
import {
  AIImportExamplesService,
  MergedExamples,
} from './ai-import-examples.service';
import { TextNormalizationService } from './text-normalization.service';
import { OCRCorrectionService } from './ocr-correction.service';
import {
  FIELD_PROMPTS,
  buildFieldPrompt,
  TOP_LEVEL_FIELDS,
  ORIGIN_FIELDS,
} from '../../data/ai-import/ai-field-prompts';

/**
 * Service for multi-step field extraction using focused LLM prompts.
 */
@Injectable({
  providedIn: 'root',
})
export class FieldExtractionService {
  constructor(
    private readonly translate: TranslateService,
    private readonly uiLog: UILog,
    private readonly uiAlert: UIAlert,
    private readonly aiImportExamples: AIImportExamplesService,
    private readonly textNorm: TextNormalizationService,
    private readonly ocrCorrection: OCRCorrectionService,
  ) {}

  /**
   * Main extraction entry point.
   * Extracts all fields using multi-step focused prompts.
   */
  public async extractAllFields(
    ocrText: string,
    languages: string[],
  ): Promise<Bean> {
    // Debug: Log raw OCR text (using console.log for Xcode visibility)
    console.log('=== RAW OCR TEXT ===');
    console.log(ocrText);
    console.log('=== END RAW OCR TEXT ===');

    // Step 0: Load merged i18n examples
    const examples = await this.aiImportExamples.getMergedExamples(languages);

    // Step 1: Pre-process text
    const normalizedText = this.preProcess(ocrText, examples);
    console.log('=== NORMALIZED TEXT ===');
    console.log(normalizedText);
    console.log('=== END NORMALIZED TEXT ===');

    // Step 2: Detect structure
    this.updateProgress('STRUCTURE');
    const beanMix = await this.extractField(
      'beanMix',
      normalizedText,
      examples,
      languages,
    );
    let originCount = 1;
    if (beanMix === 'BLEND') {
      originCount = await this.extractField(
        'originCount',
        normalizedText,
        examples,
        languages,
      );
      originCount = Math.max(1, Math.min(originCount || 1, 5)); // Limit 1-5
    }
    this.uiLog.log(`Structure: beanMix=${beanMix}, originCount=${originCount}`);

    // Step 3: Extract top-level fields sequentially
    const topLevelResults = await this.extractFieldsSequentially(
      TOP_LEVEL_FIELDS,
      normalizedText,
      examples,
      languages,
      'TOP_LEVEL',
    );
    this.uiLog.log('Top-level results: ' + JSON.stringify(topLevelResults));

    // Step 4: Extract origin fields for each origin sequentially
    const beanInfoArray: Partial<IBeanInformation>[] = [];
    for (let i = 0; i < originCount; i++) {
      const originResults = await this.extractFieldsSequentially(
        ORIGIN_FIELDS,
        normalizedText,
        examples,
        languages,
        `ORIGIN_${i + 1}`,
      );
      beanInfoArray.push(this.buildBeanInformation(originResults));
    }

    // Step 5: Post-process and validate
    this.updateProgress('VALIDATING');
    const bean = this.constructBean(topLevelResults, beanMix, beanInfoArray);
    return this.validateBean(bean);
  }

  /**
   * Pre-process OCR text before LLM extraction.
   */
  private preProcess(ocrText: string, examples: MergedExamples): string {
    // 1. Basic normalization (numbers, altitude) - before case normalization
    let text = this.textNorm.normalizeNumbers(ocrText);
    text = this.textNorm.normalizeAltitude(text);

    // 2. Fuzzy match known terms (uses examples vocabularies)
    text = this.ocrCorrection.correctOCRErrors(text, examples);

    // 3. Case normalization (after OCR correction to preserve known terms)
    text = this.textNorm.normalizeCase(text);

    return text;
  }

  /**
   * Extract multiple fields sequentially.
   * Sequential extraction is required because CapgoLLM's event listeners
   * are global and don't filter by chatId - parallel extraction causes
   * cross-contamination of responses between fields.
   */
  private async extractFieldsSequentially(
    fields: string[],
    ocrText: string,
    examples: MergedExamples,
    languages: string[],
    progressPrefix: string,
  ): Promise<Record<string, any>> {
    const resultMap: Record<string, any> = {};

    for (const field of fields) {
      // Update progress for each field
      this.updateFieldProgress(progressPrefix, field);

      try {
        resultMap[field] = await this.extractField(
          field,
          ocrText,
          examples,
          languages,
        );
      } catch (error) {
        this.uiLog.error(`Error extracting ${field}: ${error}`);
        resultMap[field] = null;
      }
    }

    return resultMap;
  }

  /**
   * Extract a single field using LLM.
   */
  private async extractField(
    fieldName: string,
    ocrText: string,
    examples: MergedExamples,
    languages: string[],
  ): Promise<any> {
    const config = FIELD_PROMPTS[fieldName];
    if (!config) {
      this.uiLog.error(`Unknown field: ${fieldName}`);
      return null;
    }

    try {
      // Build the prompt
      const prompt = buildFieldPrompt(fieldName, ocrText, examples, languages);
      console.log(`=== PROMPT FOR ${fieldName} ===`);
      console.log(prompt);
      console.log(`=== END PROMPT FOR ${fieldName} ===`);

      // Send to LLM
      const response = await this.sendLLMMessage(prompt);
      const cleaned = this.cleanResponse(response);

      console.log(`${fieldName} response: "${cleaned}"`);

      // Handle null/not found responses (exact match only - partial NOT_FOUND handled by postProcess)
      if (
        !cleaned ||
        cleaned.toLowerCase() === 'null' ||
        cleaned.toLowerCase() === 'none' ||
        cleaned.toUpperCase() === 'NOT_FOUND'
      ) {
        return null;
      }

      // Validate if pattern provided
      if (config.validation && !config.validation.test(cleaned)) {
        this.uiLog.log(`${fieldName} failed validation: ${cleaned}`);
        return null;
      }

      // Post-process if handler provided
      if (config.postProcess) {
        return config.postProcess(cleaned);
      }

      return cleaned;
    } catch (error) {
      this.uiLog.error(`Error extracting ${fieldName}: ${error}`);
      return null;
    }
  }

  /**
   * Send a message to the LLM and wait for response.
   */
  private async sendLLMMessage(prompt: string): Promise<string> {
    // Set up Apple Intelligence model
    await CapgoLLM.setModel({ path: 'Apple Intelligence' });

    // Create chat session
    const { id: chatId } = await CapgoLLM.createChat();

    // Track the response
    let latestSnapshot = '';
    let resolved = false;

    return new Promise<string>(async (resolve, reject) => {
      const cleanup = async (textListener: any, finishedListener: any) => {
        try {
          await textListener?.remove();
          await finishedListener?.remove();
        } catch (e) {
          this.uiLog.error('Error cleaning up listeners: ' + e);
        }
      };

      const resolveOnce = async (
        value: string,
        textListener: any,
        finishedListener: any,
      ) => {
        if (!resolved) {
          resolved = true;
          await cleanup(textListener, finishedListener);
          resolve(value);
        }
      };

      // Listen for text chunks
      const textListener = await CapgoLLM.addListener(
        'textFromAi',
        (event: any) => {
          if (event.text) {
            latestSnapshot = event.text;
          }
        },
      );

      // Listen for completion
      const finishedListener = await CapgoLLM.addListener(
        'aiFinished',
        async () => {
          await resolveOnce(latestSnapshot, textListener, finishedListener);
        },
      );

      // Timeout fallback (15 seconds per field)
      setTimeout(async () => {
        if (!resolved) {
          this.uiLog.log('LLM timeout, using latest snapshot');
          await resolveOnce(
            latestSnapshot || '',
            textListener,
            finishedListener,
          );
        }
      }, 15000);

      // Send message
      await CapgoLLM.sendMessage({
        chatId,
        message: prompt,
      });
    });
  }

  /**
   * Clean up LLM response.
   */
  private cleanResponse(response: string): string {
    if (!response) {
      return '';
    }

    let cleaned = response.trim();

    // Remove markdown code blocks if present
    const codeMatch = cleaned.match(/```(?:\w+)?\s*([\s\S]*?)```/);
    if (codeMatch) {
      cleaned = codeMatch[1].trim();
    }

    // Remove surrounding quotes
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1);
    }

    // Remove NOT_FOUND if appended to valid content (exact NOT_FOUND handled in extractField)
    cleaned = cleaned.replace(/\s*NOT_FOUND\s*/gi, ' ').trim();

    return cleaned;
  }

  /**
   * Build IBeanInformation from extracted fields.
   */
  private buildBeanInformation(
    fields: Record<string, any>,
  ): Partial<IBeanInformation> {
    const info: Partial<IBeanInformation> = {
      country: fields.country || '',
      region: fields.region || '',
      farm: fields.farm || '',
      farmer: fields.farmer || '',
      elevation: fields.elevation || '',
      harvest_time: fields.harvest_time || '',
      variety: fields.variety || '',
      processing: fields.processing || '',
      certification: fields.certification || '',
      purchasing_price: 0,
      fob_price: 0,
    };

    // Only add percentage if it's a meaningful value (not null, '', 0, or 100)
    const pct = fields.percentage;
    if (pct !== null && pct !== '' && pct !== 0 && pct !== 100) {
      info.percentage = pct;
    }

    return info;
  }

  /**
   * Construct Bean object from extracted fields.
   */
  private constructBean(
    topLevel: Record<string, any>,
    beanMix: string | null,
    beanInfo: Partial<IBeanInformation>[],
  ): Bean {
    const bean = new Bean();

    // Set top-level fields
    if (topLevel.name) {
      bean.name = topLevel.name;
    }
    if (topLevel.roaster) {
      bean.roaster = topLevel.roaster;
    }
    if (topLevel.weight) {
      // Extract weight handles conversion to grams
      const weight = this.textNorm.extractWeight(topLevel.weight.toString());
      bean.weight = weight || 0;
    }
    if (topLevel.bean_roasting_type) {
      bean.bean_roasting_type = topLevel.bean_roasting_type;
    }
    if (topLevel.aromatics) {
      bean.aromatics = topLevel.aromatics;
    }
    if (
      topLevel.decaffeinated !== null &&
      topLevel.decaffeinated !== undefined
    ) {
      bean.decaffeinated = topLevel.decaffeinated;
    }
    if (topLevel.cupping_points) {
      bean.cupping_points = topLevel.cupping_points;
    }

    // Set beanMix
    if (beanMix) {
      bean.beanMix = beanMix as any;
    }

    // Set bean_information array
    bean.bean_information = beanInfo.filter(
      (info) =>
        info.country ||
        info.region ||
        info.variety ||
        info.processing ||
        info.farm ||
        info.farmer,
    ) as IBeanInformation[];

    return bean;
  }

  /**
   * Cross-field validation and cleanup.
   */
  private validateBean(bean: Bean): Bean {
    // If country detected but beanMix is null/unknown, set to SINGLE_ORIGIN
    if (
      bean.bean_information.length === 1 &&
      (!bean.beanMix || bean.beanMix === ('UNKNOWN' as any))
    ) {
      bean.beanMix = 'SINGLE_ORIGIN' as any;
    }

    // If multiple countries, ensure BLEND
    if (bean.bean_information.length > 1 && bean.beanMix !== ('BLEND' as any)) {
      bean.beanMix = 'BLEND' as any;
    }

    // Ensure at least one bean_information entry exists if any origin data
    if (bean.bean_information.length === 0) {
      bean.bean_information = [
        {
          country: '',
          region: '',
          farm: '',
          farmer: '',
          elevation: '',
          harvest_time: '',
          variety: '',
          processing: '',
          certification: '',
          purchasing_price: 0,
          fob_price: 0,
        } as IBeanInformation,
      ];
    }

    return bean;
  }

  /**
   * Update progress message in loading spinner.
   */
  private updateProgress(stepKey: string): void {
    try {
      const stepName = this.translate.instant(`AI_IMPORT_STEP_${stepKey}`);
      const baseMessage = this.translate.instant('AI_IMPORT_STEP_ANALYZING');
      this.uiAlert.setLoadingSpinnerMessage(`${baseMessage} - ${stepName}`);
    } catch (e) {
      // Silently fail if translation not found
    }
  }

  /**
   * Update progress message with current field being extracted.
   */
  private updateFieldProgress(prefix: string, fieldName: string): void {
    try {
      const baseMessage = this.translate.instant('AI_IMPORT_STEP_ANALYZING');
      // Try to get translated field name, fallback to formatted field name
      let fieldLabel = this.translate.instant(
        `AI_IMPORT_FIELD_${fieldName.toUpperCase()}`,
      );
      if (fieldLabel === `AI_IMPORT_FIELD_${fieldName.toUpperCase()}`) {
        // Translation not found, format the field name nicely
        fieldLabel = fieldName
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
      this.uiAlert.setLoadingSpinnerMessage(`${baseMessage} - ${fieldLabel}`);
    } catch (e) {
      // Silently fail if translation not found
    }
  }
}
