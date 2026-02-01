import { Injectable, isDevMode } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Bean } from '../../classes/bean/bean';
import {
  sendLLMPrompt,
  extractJsonFromResponse,
  isNullLikeValue,
} from './llm-communication.service';
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
import {
  LLM_TIMEOUT_PER_FIELD_MS,
  MAX_VALID_ELEVATION_METERS,
  MAX_BLEND_PERCENTAGE,
} from '../../data/ai-import/ai-import-constants';

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
    // Debug: Log raw OCR text
    this.debugLog('RAW OCR TEXT', ocrText);

    // Get user's bean customization settings
    const settings = this.uiSettingsStorage.getSettings();
    const params = settings.bean_manage_parameters;

    // Load merged i18n examples
    const examples = await this.aiImportExamples.getMergedExamples(languages);

    // Pre-process text
    const text = this.preProcess(ocrText, examples);
    this.debugLog('NORMALIZED TEXT', text);

    const bean = new Bean();

    // === TOP-LEVEL FIELDS ===

    // Name and Roaster - extract together for better disambiguation
    this.updateProgress('NAME_AND_ROASTER');
    const nameAndRoaster = await this.extractNameAndRoaster(
      text,
      examples,
      languages,
    );
    bean.name = nameAndRoaster.name;
    if (params.roaster) {
      bean.roaster = nameAndRoaster.roaster;
    }

    // Weight - always extract (essential for ratios)
    this.updateFieldProgress('TOP_LEVEL', 'weight');
    const weightStr = await this.extractField(
      'weight',
      text,
      examples,
      languages,
    );
    if (weightStr) {
      bean.weight = this.textNorm.extractWeight(weightStr.toString()) || 0;
    }

    // Bean roasting type
    if (params.bean_roasting_type) {
      this.updateFieldProgress('TOP_LEVEL', 'bean_roasting_type');
      bean.bean_roasting_type = await this.extractField(
        'bean_roasting_type',
        text,
        examples,
        languages,
      );
    }

    // Aromatics
    if (params.aromatics) {
      this.updateFieldProgress('TOP_LEVEL', 'aromatics');
      bean.aromatics =
        (await this.extractField('aromatics', text, examples, languages)) || '';
    }

    // Decaffeinated
    if (params.decaffeinated) {
      this.updateFieldProgress('TOP_LEVEL', 'decaffeinated');
      const decafResult = await this.extractField(
        'decaffeinated',
        text,
        examples,
        languages,
      );
      if (decafResult !== null && decafResult !== undefined) {
        bean.decaffeinated = decafResult;
      }
    }

    // Cupping points
    if (params.cupping_points) {
      this.updateFieldProgress('TOP_LEVEL', 'cupping_points');
      bean.cupping_points = await this.extractField(
        'cupping_points',
        text,
        examples,
        languages,
      );
    }

    // Roasting date
    if (params.roastingDate) {
      this.updateFieldProgress('TOP_LEVEL', 'roastingDate');
      bean.roastingDate = await this.extractField(
        'roastingDate',
        text,
        examples,
        languages,
      );
    }

    // === ORIGIN FIELDS ===

    // Only extract origin info if bean_information is enabled
    if (params.bean_information) {
      // Detect structure (single origin vs blend)
      this.updateProgress('STRUCTURE');
      const beanMix = await this.extractField(
        'beanMix',
        text,
        examples,
        languages,
      );
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
        const info = await this.extractSingleOriginInfo(
          text,
          examples,
          languages,
          params,
        );
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
      this.debugLog(`PROMPT FOR ${fieldName}`, prompt);

      // Send to LLM
      const response = await this.sendLLMMessage(prompt);
      const cleaned = this.cleanResponse(response);

      this.debugLog(`${fieldName} response`, cleaned);

      // Handle null/not found responses (exact match only - partial NOT_FOUND handled by postProcess)
      if (isNullLikeValue(cleaned)) {
        return null;
      }

      // Validate if pattern provided
      if (config.validation && !config.validation.test(cleaned)) {
        this.uiLog.log(`${fieldName} failed validation: ${cleaned}`);
        return null;
      }

      // Post-process if handler provided
      if (config.postProcess) {
        return config.postProcess(cleaned, ocrText);
      }

      return cleaned;
    } catch (error) {
      this.uiLog.error(`Error extracting ${fieldName}: ${error}`);
      return null;
    }
  }

  /**
   * Extract name and roaster together for better disambiguation.
   */
  private async extractNameAndRoaster(
    ocrText: string,
    examples: MergedExamples,
    languages: string[],
  ): Promise<{ name: string; roaster: string }> {
    try {
      // Build the combined prompt
      const prompt = buildFieldPrompt(
        'name_and_roaster',
        ocrText,
        examples,
        languages,
      );
      this.debugLog('PROMPT FOR name_and_roaster', prompt);

      // Send to LLM
      const response = await this.sendLLMMessage(prompt);
      // Don't use cleanResponse - it strips colons which breaks JSON
      const trimmed = response?.trim() || '';

      this.debugLog('name_and_roaster response', trimmed);

      // Parse JSON response
      return this.parseNameAndRoasterResponse(trimmed);
    } catch (error) {
      this.uiLog.error(`Error in combined extraction: ${error}`);
      return { name: '', roaster: '' };
    }
  }

  /**
   * Parse the combined name/roaster JSON response.
   */
  private parseNameAndRoasterResponse(response: string): {
    name: string;
    roaster: string;
  } {
    const parsed = extractJsonFromResponse<{ name?: string; roaster?: string }>(
      response,
    );
    if (!parsed) {
      this.uiLog.error('Failed to parse name/roaster JSON');
      return { name: '', roaster: '' };
    }

    // Extract and sanitize values
    let name = this.sanitizeNameRoasterField(parsed.name);
    let roaster = this.sanitizeNameRoasterField(parsed.roaster);

    // Apply title case normalization
    if (name) {
      name = this.textNorm.normalizeCase(name);
    }
    if (roaster) {
      roaster = this.textNorm.normalizeCase(roaster);
    }

    return { name: name || '', roaster: roaster || '' };
  }

  /**
   * Sanitize a name/roaster field value.
   */
  private sanitizeNameRoasterField(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (isNullLikeValue(trimmed)) {
      return '';
    }
    return trimmed;
  }

  /**
   * Send a message to the LLM and wait for response.
   *
   * IMPORTANT: Fields are extracted sequentially (not in parallel) because
   * CapgoLLM uses global event listeners. Parallel extraction causes event
   * contamination between concurrent chat sessions, where responses from one
   * prompt can be incorrectly associated with another prompt's listener.
   *
   * DO NOT attempt to parallelize field extraction (e.g., Promise.all) without
   * first refactoring CapgoLLM to use scoped event listeners per chat session.
   */
  private async sendLLMMessage(prompt: string): Promise<string> {
    return sendLLMPrompt(prompt, {
      timeoutMs: LLM_TIMEOUT_PER_FIELD_MS,
      logger: this.uiLog,
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

    // Remove colons (often left over from label prefixes like "Region:")
    cleaned = cleaned.replace(/:/g, '').trim();

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

    this.debugLog('BLEND ORIGINS PROMPT', prompt);

    // Send to LLM
    const response = await this.sendLLMMessage(prompt);
    // Note: Don't use cleanResponse here - it strips colons which breaks JSON syntax
    const trimmed = response?.trim() || '';

    this.debugLog('BLEND ORIGINS RESPONSE', trimmed);

    // Parse JSON response (handles markdown code blocks internally)
    return this.parseBlendOriginsResponse(trimmed);
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
    info.country =
      (await this.extractField('country', text, examples, languages)) || '';

    // Region
    if (params.region) {
      this.updateFieldProgress('ORIGIN', 'region');
      info.region =
        (await this.extractField('region', text, examples, languages)) || '';
    }

    // Variety
    if (params.variety) {
      this.updateFieldProgress('ORIGIN', 'variety');
      info.variety =
        (await this.extractField('variety', text, examples, languages)) || '';
    }

    // Processing
    if (params.processing) {
      this.updateFieldProgress('ORIGIN', 'processing');
      info.processing =
        (await this.extractField('processing', text, examples, languages)) ||
        '';
    }

    // Elevation
    if (params.elevation) {
      this.updateFieldProgress('ORIGIN', 'elevation');
      info.elevation =
        (await this.extractField('elevation', text, examples, languages)) || '';
    }

    // Farm
    if (params.farm) {
      this.updateFieldProgress('ORIGIN', 'farm');
      info.farm =
        (await this.extractField('farm', text, examples, languages)) || '';
    }

    // Farmer
    if (params.farmer) {
      this.updateFieldProgress('ORIGIN', 'farmer');
      info.farmer =
        (await this.extractField('farmer', text, examples, languages)) || '';
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
    const rawOrigins = await this.extractBlendOrigins(
      text,
      examples,
      languages,
    );

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
    const parsed = extractJsonFromResponse<unknown>(response);

    if (!parsed) {
      // JSON parse failed - return empty origin
      this.uiLog.error('Failed to parse blend origins JSON');
      return [this.createEmptyBeanInformation()];
    }

    if (!Array.isArray(parsed)) {
      // Single object returned - wrap in array
      return [this.sanitizeBlendOriginObject(parsed)];
    }

    // Sanitize each origin object
    const results = parsed.map((obj) => this.sanitizeBlendOriginObject(obj));

    // Ensure at least one origin
    return results.length > 0 ? results : [this.createEmptyBeanInformation()];
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
    if (typeof pct === 'number' && pct > 0 && pct < MAX_BLEND_PERCENTAGE) {
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
    if (isNullLikeValue(trimmed)) {
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
    if (isNullLikeValue(trimmed)) {
      return '';
    }

    // Validate elevation is reasonable - filters out variety numbers like 74158
    const allNumbers = trimmed.match(/\d+/g);
    if (allNumbers) {
      for (const numStr of allNumbers) {
        const num = parseInt(numStr, 10);
        if (num >= MAX_VALID_ELEVATION_METERS) {
          return ''; // Likely not an elevation
        }
      }
    }

    return trimmed;
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
    const baseMessage = this.translate.instant('AI_IMPORT_STEP_ANALYZING');
    let stepName = this.translate.instant(`AI_IMPORT_STEP_${stepKey}`);
    if (stepName === `AI_IMPORT_STEP_${stepKey}`) {
      // Translation not found, format the step key nicely
      stepName = stepKey
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    this.uiAlert.setLoadingSpinnerMessage(`${baseMessage} - ${stepName}`);
  }

  /**
   * Update progress message with current field being extracted.
   */
  private updateFieldProgress(prefix: string, fieldName: string): void {
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
  }

  /**
   * Debug logging helper - only logs in development mode.
   * Verbose output (prompts/responses) goes to console in dev mode.
   * Essential info always goes to UILog for app debug viewer.
   */
  private debugLog(label: string, data?: any): void {
    const message = `[AI Import] ${label}`;
    if (isDevMode()) {
      console.log(`=== ${label} ===`);
      if (data !== undefined) {
        console.log(data);
      }
      console.log(`=== END ${label} ===`);
    }
    // Always log to UILog for debug viewer (truncated for large data)
    const truncatedData =
      typeof data === 'string' && data.length > 200
        ? data.substring(0, 200) + '...'
        : data;
    this.uiLog.debug(`${message}: ${truncatedData ?? ''}`);
  }
}
