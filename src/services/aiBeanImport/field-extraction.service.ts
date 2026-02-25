import { inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { Bean } from '../../classes/bean/bean';
import {
  BEAN_IMPORT_SYSTEM_INSTRUCTIONS,
  BLEND_ORIGINS_PROMPT_TEMPLATE,
  buildFieldPrompt,
  FIELD_PROMPTS,
} from '../../data/ai-import/ai-field-prompts';
import {
  LLM_TIMEOUT_PER_FIELD_MS,
  MAX_BLEND_PERCENTAGE,
} from '../../data/ai-import/ai-import-constants';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { IBeanInformation } from '../../interfaces/bean/iBeanInformation';
import { IBeanParameter } from '../../interfaces/parameter/iBeanParameter';
import { UIAlert } from '../uiAlert';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import {
  AIImportExamplesService,
  MergedExamples,
} from './ai-import-examples.service';
import {
  extractJsonFromResponse,
  isNullLikeValue,
  sendLLMPrompt,
} from './llm-communication.service';
import { OCRCorrectionService } from './ocr-correction.service';
import {
  sanitizeElevation,
  TextNormalizationService,
} from './text-normalization.service';
import { mapToBeanMix } from './type-mappings';

/**
 * Result of extracting top-level bean fields.
 */
interface TopLevelFieldsResult {
  name: string;
  roaster: string;
  weight: number;
  bean_roasting_type?: BEAN_ROASTING_TYPE_ENUM;
  aromatics?: string;
  decaffeinated?: boolean;
  cupping_points?: number;
  roastingDate?: string;
}

/**
 * Result of extracting origin-related fields.
 */
interface OriginFieldsResult {
  beanMix: BEAN_MIX_ENUM;
  bean_information: IBeanInformation[];
}

/**
 * Service for multi-step field extraction using focused LLM prompts.
 */
@Injectable({
  providedIn: 'root',
})
export class FieldExtractionService {
  private readonly translate = inject(TranslateService);
  private readonly uiLog = inject(UILog);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly aiImportExamples = inject(AIImportExamplesService);
  private readonly textNorm = inject(TextNormalizationService);
  private readonly ocrCorrection = inject(OCRCorrectionService);

  /**
   * Main extraction entry point.
   * Extracts only fields enabled in user's bean customization settings.
   *
   * Error handling: If an unexpected error occurs during the extraction pipeline,
   * this method returns a minimal fallback bean rather than crashing. This allows
   * users to manually fill in fields rather than losing their captured photos.
   * Individual field extraction failures are handled gracefully (returning null)
   * and don't interrupt the overall pipeline.
   */
  public async extractAllFields(
    ocrText: string,
    languages: string[],
  ): Promise<Bean> {
    try {
      // Get user's bean customization settings
      const settings = this.uiSettingsStorage.getSettings();
      const params = settings.bean_manage_parameters;

      // Load merged i18n examples
      const examples = await this.aiImportExamples.getMergedExamples(languages);

      // Pre-process text
      const text = this.preProcess(ocrText, examples);
      this.uiLog.debug('Normalized text length: ' + text.length);

      // Extract fields in two phases
      const topLevelFields = await this.extractTopLevelFields(
        text,
        examples,
        languages,
        params,
      );
      const originFields = await this.extractOriginFields(
        text,
        examples,
        languages,
        params,
      );

      // Construct and return final bean
      return this.constructBeanFromExtractedData(topLevelFields, originFields);
    } catch (error: any) {
      // Unexpected error in extraction pipeline - log and return fallback bean
      this.uiLog.error(
        `[AI Import] Field extraction failed unexpectedly: ${error?.message || error}`,
      );

      // Return minimal bean rather than crashing - allows user to manually fill fields
      const fallbackBean = new Bean();
      fallbackBean.bean_information = [this.createEmptyBeanInformation()];
      return fallbackBean;
    }
  }

  /**
   * Extract top-level bean fields (name, roaster, weight, roasting type, etc.)
   * These are fields that apply to the bean as a whole, not to individual origins.
   */
  private async extractTopLevelFields(
    text: string,
    examples: MergedExamples,
    languages: string[],
    params: IBeanParameter,
  ): Promise<TopLevelFieldsResult> {
    const result: TopLevelFieldsResult = {
      name: '',
      roaster: '',
      weight: 0,
    };

    // Name and Roaster - extract together for better disambiguation
    this.updateProgress('NAME_AND_ROASTER');
    const nameAndRoaster = await this.extractNameAndRoaster(
      text,
      examples,
      languages,
    );
    result.name = nameAndRoaster.name;
    if (params.roaster) {
      result.roaster = nameAndRoaster.roaster;
    }

    this.updateFieldProgress('TOP_LEVEL', 'weight');
    const weightStr = await this.extractField(
      'weight',
      text,
      examples,
      languages,
    );
    if (weightStr) {
      result.weight = this.textNorm.extractWeight(weightStr.toString()) || 0;
    }

    // Bean roasting type
    if (params.bean_roasting_type) {
      this.updateFieldProgress('TOP_LEVEL', 'bean_roasting_type');
      result.bean_roasting_type = await this.extractField(
        'bean_roasting_type',
        text,
        examples,
        languages,
      );
    }

    // Aromatics
    if (params.aromatics) {
      this.updateFieldProgress('TOP_LEVEL', 'aromatics');
      result.aromatics =
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
        result.decaffeinated = decafResult;
      }
    }

    // Cupping points
    if (params.cupping_points) {
      this.updateFieldProgress('TOP_LEVEL', 'cupping_points');
      result.cupping_points = await this.extractField(
        'cupping_points',
        text,
        examples,
        languages,
      );
    }

    // Roasting date
    if (params.roastingDate) {
      this.updateFieldProgress('TOP_LEVEL', 'roastingDate');
      result.roastingDate = await this.extractField(
        'roastingDate',
        text,
        examples,
        languages,
      );
    }

    return result;
  }

  /**
   * Extract origin-related fields based on detected bean mix type.
   * Handles both single origin (per-field extraction) and blend (bulk JSON extraction).
   */
  private async extractOriginFields(
    text: string,
    examples: MergedExamples,
    languages: string[],
    params: IBeanParameter,
  ): Promise<OriginFieldsResult> {
    const result: OriginFieldsResult = {
      beanMix: 'UNKNOWN' as BEAN_MIX_ENUM,
      bean_information: [],
    };

    // Only extract origin info if bean_information is enabled
    if (!params.bean_information) {
      return result;
    }

    // Detect structure (single origin vs blend)
    this.updateProgress('STRUCTURE');
    const beanMixRaw = await this.extractField(
      'beanMix',
      text,
      examples,
      languages,
    );
    result.beanMix = mapToBeanMix(beanMixRaw);
    this.uiLog.log(`Structure: beanMix=${result.beanMix}`);

    if (result.beanMix === mapToBeanMix('BLEND')) {
      // BLEND: Extract all origins via single JSON prompt, then filter fields by user settings
      this.updateProgress('BLEND_ORIGINS');
      result.bean_information = await this.extractBlendOriginsFiltered(
        text,
        examples,
        languages,
        params,
      );
      this.uiLog.log(
        `Blend origins extracted: ${result.bean_information.length} components`,
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
        result.bean_information.push(info);
      }
    }

    return result;
  }

  /**
   * Construct a Bean object from extracted field data.
   * Applies cross-field validation and ensures data consistency.
   */
  private constructBeanFromExtractedData(
    topLevelFields: TopLevelFieldsResult,
    originFields: OriginFieldsResult,
  ): Bean {
    const bean = new Bean();

    // Assign top-level fields
    bean.name = topLevelFields.name;
    bean.roaster = topLevelFields.roaster;
    bean.weight = topLevelFields.weight;

    if (topLevelFields.bean_roasting_type != null) {
      bean.bean_roasting_type = topLevelFields.bean_roasting_type;
    }
    if (topLevelFields.aromatics != null) {
      bean.aromatics = topLevelFields.aromatics;
    }
    if (topLevelFields.decaffeinated != null) {
      bean.decaffeinated = topLevelFields.decaffeinated;
    }
    if (topLevelFields.cupping_points != null) {
      bean.cupping_points = String(topLevelFields.cupping_points);
    }
    if (topLevelFields.roastingDate != null) {
      bean.roastingDate = topLevelFields.roastingDate;
    }

    // Assign origin fields
    bean.beanMix = originFields.beanMix;
    bean.bean_information = originFields.bean_information;

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
   *
   * Error handling: Returns null if extraction fails. Caller should
   * treat null as "field not found in OCR text" and continue with
   * other fields. Errors are logged for debugging but do not
   * interrupt the extraction pipeline.
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

      // Send to LLM
      const response = await this.sendLLMMessage(prompt);
      const cleaned = this.cleanResponse(response);

      this.uiLog.debug(fieldName + ' response: ' + cleaned);

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

      // Send to LLM
      const response = await this.sendLLMMessage(prompt);
      // Don't use cleanResponse - it strips colons which breaks JSON
      const trimmed = response?.trim() || '';

      this.uiLog.debug('name_and_roaster response: ' + trimmed);

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
    let name = this.sanitizeStringField(parsed.name);
    let roaster = this.sanitizeStringField(parsed.roaster);

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
      instructions: BEAN_IMPORT_SYSTEM_INSTRUCTIONS,
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
    const codeMatch = /```(?:\w+)?\s*([\s\S]*?)```/.exec(cleaned);
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
   *
   * Blend labels often have sparse, scattered origin info (e.g., just country names
   * or percentages without clear context). A single combined prompt reduces
   * hallucinations compared to per-field extraction, because the LLM can see all
   * origin-related text together and make consistent inferences.
   *
   * Returns an array of partial IBeanInformation objects.
   */
  private async extractBlendOrigins(
    ocrText: string,
    examples: MergedExamples,
    languages: string[],
  ): Promise<Partial<IBeanInformation>[]> {
    // Build the blend-specific prompt
    const prompt = this.buildBlendOriginsPrompt(ocrText, examples, languages);

    // Send to LLM
    const response = await this.sendLLMMessage(prompt);
    // Note: Don't use cleanResponse here - it strips colons which breaks JSON syntax
    const trimmed = response?.trim() || '';

    this.uiLog.debug('Blend origins response: ' + trimmed);

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
      elevation: sanitizeElevation(obj?.elevation) ?? '',
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
   * Cross-field validation and cleanup.
   */
  private validateBean(bean: Bean): Bean {
    // If country detected but beanMix is null/unknown, set to SINGLE_ORIGIN
    // Note: Uses enum key strings (e.g., 'UNKNOWN') matching the app convention
    // where Bean constructor and UI ion-select options use key strings, not enum values.
    if (
      bean.bean_information.length === 1 &&
      (!bean.beanMix || bean.beanMix === ('UNKNOWN' as BEAN_MIX_ENUM))
    ) {
      bean.beanMix = 'SINGLE_ORIGIN' as BEAN_MIX_ENUM;
    }

    // If multiple countries, ensure BLEND
    if (
      bean.bean_information.length > 1 &&
      bean.beanMix !== ('BLEND' as BEAN_MIX_ENUM)
    ) {
      bean.beanMix = 'BLEND' as BEAN_MIX_ENUM;
    }

    // Ensure at least one bean_information entry exists if any origin data
    if (bean.bean_information.length === 0) {
      bean.bean_information = [this.createEmptyBeanInformation()];
    }

    return bean;
  }

  /**
   * Update progress message in loading spinner.
   *
   * Error handling: Logs a warning if translation is missing. This is a
   * cosmetic issue that doesn't interrupt extraction but helps catch
   * missing translation keys during development.
   */
  private updateProgress(stepKey: string): void {
    try {
      const baseMessage = this.translate.instant('AI_IMPORT_STEP_ANALYZING');
      let stepName = this.translate.instant(`AI_IMPORT_STEP_${stepKey}`);
      if (stepName === `AI_IMPORT_STEP_${stepKey}`) {
        // Translation not found, log warning and format the step key nicely
        this.uiLog.warn(
          `[AI Import] Translation missing for AI_IMPORT_STEP_${stepKey}`,
        );
        stepName = stepKey
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
      this.uiAlert.setLoadingSpinnerMessage(`${baseMessage} - ${stepName}`);
    } catch (e) {
      // Log cosmetic failure but don't interrupt extraction
      this.uiLog.warn(`[AI Import] updateProgress failed for ${stepKey}: ${e}`);
    }
  }

  /**
   * Update progress message with current field being extracted.
   *
   * Error handling: Logs a warning if translation is missing. This is a
   * cosmetic issue that doesn't interrupt extraction but helps catch
   * missing translation keys during development.
   */
  private updateFieldProgress(prefix: string, fieldName: string): void {
    try {
      const baseMessage = this.translate.instant('AI_IMPORT_STEP_ANALYZING');
      // Try to get translated field name, fallback to formatted field name
      let fieldLabel = this.translate.instant(
        `AI_IMPORT_FIELD_${fieldName.toUpperCase()}`,
      );
      if (fieldLabel === `AI_IMPORT_FIELD_${fieldName.toUpperCase()}`) {
        // Translation not found, log warning and format the field name nicely
        this.uiLog.warn(
          `[AI Import] Translation missing for AI_IMPORT_FIELD_${fieldName.toUpperCase()}`,
        );
        fieldLabel = fieldName
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
      }
      this.uiAlert.setLoadingSpinnerMessage(`${baseMessage} - ${fieldLabel}`);
    } catch (e) {
      // Log cosmetic failure but don't interrupt extraction
      this.uiLog.warn(
        `[AI Import] updateFieldProgress failed for ${fieldName}: ${e}`,
      );
    }
  }
}
