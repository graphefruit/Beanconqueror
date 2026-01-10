import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CapgoLLM } from '@capgo/capacitor-llm';
import { Bean } from '../../classes/bean/bean';
import { IBeanInformation } from '../../interfaces/bean/iBeanInformation';
import { IBeanParameter } from '../../interfaces/parameter/iBeanParameter';
import { UILog } from '../uiLog';
import { UIAlert } from '../uiAlert';
import { UISettingsStorage } from '../uiSettingsStorage';
import {
  AIImportExamplesService,
  MergedExamples,
} from './ai-import-examples.service';
import { TextNormalizationService } from './text-normalization.service';
import { OCRCorrectionService } from './ocr-correction.service';
import {
  FIELD_PROMPTS,
  buildFieldPrompt,
  BLEND_ORIGINS_PROMPT_TEMPLATE,
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
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly aiImportExamples: AIImportExamplesService,
    private readonly textNorm: TextNormalizationService,
    private readonly ocrCorrection: OCRCorrectionService,
  ) {}

  /**
   * Main extraction entry point.
   * Extracts only fields enabled in user's bean customization settings.
   */
  public async extractAllFields(
    ocrText: string,
    languages: string[],
  ): Promise<Bean> {
    // Debug: Log raw OCR text (using console.log for Xcode visibility)
    console.log('=== RAW OCR TEXT ===');
    console.log(ocrText);
    console.log('=== END RAW OCR TEXT ===');

    // Get user's bean customization settings
    const settings = this.uiSettingsStorage.getSettings();
    const params = settings.bean_manage_parameters;

    // Load merged i18n examples
    const examples = await this.aiImportExamples.getMergedExamples(languages);

    // Pre-process text
    const text = this.preProcess(ocrText, examples);
    console.log('=== NORMALIZED TEXT ===');
    console.log(text);
    console.log('=== END NORMALIZED TEXT ===');

    const bean = new Bean();

    // === TOP-LEVEL FIELDS ===

    // Name - always extract (essential)
    this.updateFieldProgress('TOP_LEVEL', 'name');
    bean.name = (await this.extractField('name', text, examples, languages)) || '';

    // Roaster
    if (params.roaster) {
      this.updateFieldProgress('TOP_LEVEL', 'roaster');
      bean.roaster = (await this.extractField('roaster', text, examples, languages)) || '';
    }

    // Weight - always extract (essential for ratios)
    this.updateFieldProgress('TOP_LEVEL', 'weight');
    const weightStr = await this.extractField('weight', text, examples, languages);
    if (weightStr) {
      bean.weight = this.textNorm.extractWeight(weightStr.toString()) || 0;
    }

    // Bean roasting type
    if (params.bean_roasting_type) {
      this.updateFieldProgress('TOP_LEVEL', 'bean_roasting_type');
      bean.bean_roasting_type = await this.extractField('bean_roasting_type', text, examples, languages);
    }

    // Aromatics
    if (params.aromatics) {
      this.updateFieldProgress('TOP_LEVEL', 'aromatics');
      bean.aromatics = (await this.extractField('aromatics', text, examples, languages)) || '';
    }

    // Decaffeinated
    if (params.decaffeinated) {
      this.updateFieldProgress('TOP_LEVEL', 'decaffeinated');
      const decafResult = await this.extractField('decaffeinated', text, examples, languages);
      if (decafResult !== null && decafResult !== undefined) {
        bean.decaffeinated = decafResult;
      }
    }

    // Cupping points
    if (params.cupping_points) {
      this.updateFieldProgress('TOP_LEVEL', 'cupping_points');
      bean.cupping_points = await this.extractField('cupping_points', text, examples, languages);
    }

    // Roasting date
    if (params.roastingDate) {
      this.updateFieldProgress('TOP_LEVEL', 'roastingDate');
      bean.roastingDate = await this.extractField('roastingDate', text, examples, languages);
    }

    // === ORIGIN FIELDS ===

    // Only extract origin info if bean_information is enabled
    if (params.bean_information) {
      // Detect structure (single origin vs blend)
      this.updateProgress('STRUCTURE');
      const beanMix = await this.extractField('beanMix', text, examples, languages);
      bean.beanMix = beanMix || ('UNKNOWN' as any);
      this.uiLog.log(`Structure: beanMix=${beanMix}`);

      if (beanMix === 'BLEND') {
        // BLEND: Use single JSON prompt, then filter by settings
        this.updateProgress('BLEND_ORIGINS');
        bean.bean_information = await this.extractBlendOriginsFiltered(
          text,
          examples,
          languages,
          params,
        );
        this.uiLog.log(
          `Blend origins extracted: ${bean.bean_information.length} components`,
        );
      } else {
        // SINGLE_ORIGIN: Use per-field extraction with settings checks
        const info = await this.extractSingleOriginInfo(text, examples, languages, params);
        if (this.hasAnyOriginData(info)) {
          bean.bean_information.push(info);
        }
      }
    }

    // Ensure at least one bean_information entry
    if (bean.bean_information.length === 0) {
      bean.bean_information = [this.createEmptyBeanInformation()];
    }

    // Final validation
    this.updateProgress('VALIDATING');
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
   * Extract all origin fields for a blend in one prompt.
   * Returns an array of partial IBeanInformation objects.
   */
  private async extractBlendOrigins(
    ocrText: string,
    examples: MergedExamples,
    languages: string[],
  ): Promise<Partial<IBeanInformation>[]> {
    // Build the blend-specific prompt
    const prompt = this.buildBlendOriginsPrompt(ocrText, examples, languages);

    console.log('=== BLEND ORIGINS PROMPT ===');
    console.log(prompt);
    console.log('=== END BLEND ORIGINS PROMPT ===');

    // Send to LLM
    const response = await this.sendLLMMessage(prompt);
    const cleaned = this.cleanResponse(response);

    console.log('=== BLEND ORIGINS RESPONSE ===');
    console.log(cleaned);
    console.log('=== END BLEND ORIGINS RESPONSE ===');

    // Parse JSON response
    return this.parseBlendOriginsResponse(cleaned);
  }

  /**
   * Extract origin fields for SINGLE_ORIGIN beans.
   * Uses per-field extraction with settings checks to skip disabled fields.
   */
  private async extractSingleOriginInfo(
    text: string,
    examples: MergedExamples,
    languages: string[],
    params: IBeanParameter,
  ): Promise<IBeanInformation> {
    const info = this.createEmptyBeanInformation();

    // Country - always extract (essential for origin tracking)
    this.updateFieldProgress('ORIGIN', 'country');
    info.country = (await this.extractField('country', text, examples, languages)) || '';

    // Region
    if (params.region) {
      this.updateFieldProgress('ORIGIN', 'region');
      info.region = (await this.extractField('region', text, examples, languages)) || '';
    }

    // Variety
    if (params.variety) {
      this.updateFieldProgress('ORIGIN', 'variety');
      info.variety = (await this.extractField('variety', text, examples, languages)) || '';
    }

    // Processing
    if (params.processing) {
      this.updateFieldProgress('ORIGIN', 'processing');
      info.processing = (await this.extractField('processing', text, examples, languages)) || '';
    }

    // Elevation
    if (params.elevation) {
      this.updateFieldProgress('ORIGIN', 'elevation');
      info.elevation = (await this.extractField('elevation', text, examples, languages)) || '';
    }

    // Farm
    if (params.farm) {
      this.updateFieldProgress('ORIGIN', 'farm');
      info.farm = (await this.extractField('farm', text, examples, languages)) || '';
    }

    // Farmer
    if (params.farmer) {
      this.updateFieldProgress('ORIGIN', 'farmer');
      info.farmer = (await this.extractField('farmer', text, examples, languages)) || '';
    }

    return info;
  }

  /**
   * Extract blend origins and filter by user settings.
   *
   * Note: We always extract ALL fields from the LLM (JSON prompt needs full context
   * to avoid hallucinations), but only populate enabled fields on the result.
   */
  private async extractBlendOriginsFiltered(
    text: string,
    examples: MergedExamples,
    languages: string[],
    params: IBeanParameter,
  ): Promise<IBeanInformation[]> {
    // Extract all origins via JSON prompt (existing method)
    const rawOrigins = await this.extractBlendOrigins(text, examples, languages);

    // Filter each origin's fields based on settings
    return rawOrigins.map((origin) =>
      this.filterOriginBySettings(origin, params),
    );
  }

  /**
   * Filter an origin object to only include enabled fields.
   */
  private filterOriginBySettings(
    origin: Partial<IBeanInformation>,
    params: IBeanParameter,
  ): IBeanInformation {
    const filtered = this.createEmptyBeanInformation();

    // Country - always include (essential)
    filtered.country = origin.country || '';

    // Only include enabled fields
    if (params.region) filtered.region = origin.region || '';
    if (params.variety) filtered.variety = origin.variety || '';
    if (params.processing) filtered.processing = origin.processing || '';
    if (params.elevation) filtered.elevation = origin.elevation || '';
    if (params.farm) filtered.farm = origin.farm || '';
    if (params.farmer) filtered.farmer = origin.farmer || '';

    // Percentage - always include for blends (not a user setting, essential for blend composition)
    if (origin.percentage) filtered.percentage = origin.percentage;

    return filtered;
  }

  /**
   * Check if an origin object has any meaningful data.
   */
  private hasAnyOriginData(info: IBeanInformation): boolean {
    return !!(
      info.country ||
      info.region ||
      info.variety ||
      info.processing ||
      info.elevation ||
      info.farm ||
      info.farmer
    );
  }

  /**
   * Create an empty IBeanInformation object with all fields initialized.
   */
  private createEmptyBeanInformation(): IBeanInformation {
    return {
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
    } as IBeanInformation;
  }

  /**
   * Build the blend origins prompt with examples substituted.
   */
  private buildBlendOriginsPrompt(
    ocrText: string,
    examples: MergedExamples,
    languages: string[],
  ): string {
    let prompt = BLEND_ORIGINS_PROMPT_TEMPLATE;

    // Replace example placeholders
    prompt = prompt.replace('{{ORIGINS}}', examples.ORIGINS || '');
    prompt = prompt.replace('{{VARIETIES}}', examples.VARIETIES || '');
    prompt = prompt.replace(
      '{{PROCESSING_METHODS}}',
      examples.PROCESSING_METHODS || '',
    );

    // Replace languages placeholder
    prompt = prompt.replace('{{LANGUAGES}}', languages.join(', '));

    // Replace OCR text placeholder
    prompt = prompt.replace('{{OCR_TEXT}}', ocrText);

    return prompt;
  }

  /**
   * Parse the blend origins JSON response.
   * Handles malformed JSON gracefully.
   */
  private parseBlendOriginsResponse(
    response: string,
  ): Partial<IBeanInformation>[] {
    try {
      // Try to extract JSON from potential markdown code blocks
      let jsonStr = response;
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // Try to parse as JSON
      const parsed = JSON.parse(jsonStr);

      if (!Array.isArray(parsed)) {
        // Single object returned - wrap in array
        return [this.sanitizeBlendOriginObject(parsed)];
      }

      // Sanitize each origin object
      const results = parsed.map((obj) => this.sanitizeBlendOriginObject(obj));

      // Ensure at least one origin
      return results.length > 0 ? results : [this.createEmptyOrigin()];
    } catch (e) {
      // JSON parse failed - return empty origin
      this.uiLog.error('Failed to parse blend origins JSON: ' + e);
      return [this.createEmptyOrigin()];
    }
  }

  /**
   * Sanitize and validate a single origin object from JSON.
   */
  private sanitizeBlendOriginObject(obj: any): Partial<IBeanInformation> {
    const info: Partial<IBeanInformation> = {
      country: this.sanitizeStringField(obj?.country),
      region: this.sanitizeStringField(obj?.region),
      variety: this.sanitizeStringField(obj?.variety),
      processing: this.sanitizeStringField(obj?.processing),
      elevation: this.sanitizeElevation(obj?.elevation),
      farm: this.sanitizeStringField(obj?.farm),
      farmer: this.sanitizeStringField(obj?.farmer),
      harvest_time: '',
      certification: '',
      purchasing_price: 0,
      fob_price: 0,
    };

    // Only add percentage if meaningful
    const pct = obj?.percentage;
    if (typeof pct === 'number' && pct > 0 && pct < 100) {
      info.percentage = pct;
    }

    return info;
  }

  /**
   * Sanitize a string field - convert null-like values to empty string.
   */
  private sanitizeStringField(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (
      trimmed.toLowerCase() === 'null' ||
      trimmed.toLowerCase() === 'not_found' ||
      trimmed.toLowerCase() === 'unknown'
    ) {
      return '';
    }
    return trimmed;
  }

  /**
   * Sanitize elevation field - validate and clean up format.
   */
  private sanitizeElevation(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value !== 'string') return '';

    const trimmed = value.trim();
    if (
      trimmed.toLowerCase() === 'null' ||
      trimmed.toLowerCase() === 'not_found' ||
      trimmed.toLowerCase() === 'unknown'
    ) {
      return '';
    }

    // Validate elevation is reasonable (< 5000m)
    const allNumbers = trimmed.match(/\d+/g);
    if (allNumbers) {
      for (const numStr of allNumbers) {
        const num = parseInt(numStr, 10);
        if (num >= 5000) {
          return ''; // Likely not an elevation
        }
      }
    }

    return trimmed;
  }

  /**
   * Create an empty origin object.
   */
  private createEmptyOrigin(): Partial<IBeanInformation> {
    return {
      country: '',
      region: '',
      variety: '',
      processing: '',
      elevation: '',
      farm: '',
      farmer: '',
      harvest_time: '',
      certification: '',
      purchasing_price: 0,
      fob_price: 0,
    };
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
