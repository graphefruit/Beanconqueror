import { inject, Injectable } from '@angular/core';

import { Bean } from '../../classes/bean/bean';
import {
  buildCloudExtractionPrompt,
  CLOUD_BEAN_IMPORT_SYSTEM_INSTRUCTIONS,
} from '../../data/ai-import/ai-cloud-prompt';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { IBeanInformation } from '../../interfaces/bean/iBeanInformation';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import {
  constructBeanFromExtractedData,
  createEmptyBeanInformation,
} from './bean-construction.service';
import {
  OriginFieldsResult,
  TopLevelFieldsResult,
} from './bean-extraction-types';
import {
  CloudLLMConfig,
  sendCloudLLMPrompt,
} from './cloud-llm-communication.service';
import {
  extractJsonFromResponse,
  isNullLikeValue,
} from './llm-communication.service';
import { parseWeightToGrams } from './weight-parsing';

// Orchestrates cloud LLM-based extraction of all bean fields from OCR text.
@Injectable({ providedIn: 'root' })
export class CloudFieldExtractionService {
  private uiSettingsStorage = inject(UISettingsStorage, { optional: true });
  private uiLog = inject(UILog, { optional: true });

  /**
   * Extract all bean fields from OCR text using a cloud LLM.
   *
   * Returns a fallback empty Bean on any failure so the user can
   * still manually fill in fields rather than losing their captured photos.
   *
   * @param ocrText Layout-enriched OCR text from the label
   * @param config  Optional cloud LLM config; defaults to current settings
   * @param logger  Optional logger; defaults to injected UILog
   */
  public async extractAllFields(
    ocrText: string,
    config?: CloudLLMConfig,
    logger?: { log(msg: string): void },
  ): Promise<Bean> {
    const log = logger ?? this.uiLog ?? { log: () => {} };

    // 1. Build config from settings if not provided
    if (!config) {
      const settings = this.uiSettingsStorage!.getSettings();
      config = {
        provider: settings.ai_provider,
        apiKey: settings.cloud_ai_api_key,
        model: settings.cloud_ai_model,
        baseUrl: settings.cloud_ai_base_url || undefined,
      };
    }

    // 2. Build prompt
    const userPrompt = buildCloudExtractionPrompt(ocrText);

    // 3. Send to cloud LLM — throws on API errors, timeouts, network failures
    log.log('[Cloud LLM] model: ' + config.model);
    log.log('[Cloud LLM] prompt: ' + userPrompt);

    const response = await sendCloudLLMPrompt(config, [
      { role: 'system', content: CLOUD_BEAN_IMPORT_SYSTEM_INSTRUCTIONS },
      { role: 'user', content: userPrompt },
    ]);

    log.log('[Cloud LLM] response: ' + response.content);
    if (response.usage) {
      log.log(
        `Token usage: ${response.usage.prompt_tokens} prompt, ${response.usage.completion_tokens} completion`,
      );
    }

    // 4. Parse JSON from response (handle potential markdown wrapping)
    // LLM response is unvalidated — all field access below is defensive
    const parsed = extractJsonFromResponse(response.content);
    if (!parsed) {
      throw new Error('Failed to parse JSON from cloud LLM response');
    }

    // 5. Map to TopLevelFieldsResult + OriginFieldsResult
    const topLevel = this.mapTopLevelFields(parsed);
    const origin = this.mapOriginFields(parsed);

    // 6. Construct bean using shared utility
    return constructBeanFromExtractedData(topLevel, origin);
  }

  /**
   * Map the parsed JSON response to TopLevelFieldsResult.
   * Uses isNullLikeValue to strip NOT_FOUND/null/unknown responses.
   */
  private mapTopLevelFields(parsed: unknown): TopLevelFieldsResult {
    const rec = parsed as Record<string, unknown>;
    const result: TopLevelFieldsResult = {
      name: '',
      roaster: '',
      weight: 0,
    };

    // Name
    if (!isNullLikeValue(rec.name as string)) {
      result.name = String(rec.name).trim();
    }

    // Roaster
    if (!isNullLikeValue(rec.roaster as string)) {
      result.roaster = String(rec.roaster).trim();
    }

    // Weight — JSON returns "250g", "1kg", "12oz" etc.; parse to grams
    if (rec.weight !== null) {
      if (typeof rec.weight === 'number') {
        result.weight = rec.weight;
      } else if (!isNullLikeValue(String(rec.weight))) {
        result.weight = parseWeightToGrams(String(rec.weight)) ?? 0;
      }
    }

    // Bean roasting type — map "FILTER"/"ESPRESSO"/"OMNI" to enum
    if (!isNullLikeValue(rec.bean_roasting_type as string)) {
      result.bean_roasting_type = this.mapRoastingType(
        String(rec.bean_roasting_type).trim(),
      );
    }

    // Aromatics
    if (!isNullLikeValue(rec.aromatics as string)) {
      result.aromatics = String(rec.aromatics).trim();
    }

    // Decaffeinated — JSON returns boolean true/false
    if (rec.decaffeinated === true || rec.decaffeinated === false) {
      result.decaffeinated = rec.decaffeinated;
    } else if (
      rec.decaffeinated !== null &&
      !isNullLikeValue(String(rec.decaffeinated))
    ) {
      result.decaffeinated = String(rec.decaffeinated).toLowerCase() === 'true';
    }

    // Cupping points — JSON returns a number
    if (rec.cupping_points !== null) {
      if (typeof rec.cupping_points === 'number') {
        result.cupping_points = rec.cupping_points;
      } else if (!isNullLikeValue(String(rec.cupping_points))) {
        const points = parseFloat(String(rec.cupping_points));
        if (!isNaN(points)) {
          result.cupping_points = points;
        }
      }
    }

    // Roasting date — JSON returns "YYYY-MM-DD"
    if (!isNullLikeValue(rec.roasting_date as string)) {
      result.roastingDate = String(rec.roasting_date).trim();
    }

    return result;
  }

  /**
   * Map the parsed JSON response to OriginFieldsResult.
   * Maps bean_mix and origins array to the shared types.
   */
  private mapOriginFields(parsed: unknown): OriginFieldsResult {
    const rec = parsed as Record<string, unknown>;
    const result: OriginFieldsResult = {
      beanMix: BEAN_MIX_ENUM.UNKNOWN,
      bean_information: [],
    };

    // Bean mix — map "SINGLE_ORIGIN"/"BLEND" to enum
    if (!isNullLikeValue(rec.bean_mix as string)) {
      result.beanMix = this.mapBeanMix(String(rec.bean_mix).trim());
    }

    // Origins — each entry maps to an IBeanInformation
    if (Array.isArray(rec.origins)) {
      result.bean_information = rec.origins.map((origin) =>
        this.mapOrigin(origin),
      );
    }

    return result;
  }

  /**
   * Map a single origin object from JSON to IBeanInformation.
   */
  private mapOrigin(origin: unknown): IBeanInformation {
    const rec = origin as Record<string, unknown>;
    const info = createEmptyBeanInformation();

    if (!isNullLikeValue(rec.country as string)) {
      info.country = String(rec.country).trim();
    }
    if (!isNullLikeValue(rec.region as string)) {
      info.region = String(rec.region).trim();
    }
    if (!isNullLikeValue(rec.variety as string)) {
      info.variety = String(rec.variety).trim();
    }
    if (!isNullLikeValue(rec.processing as string)) {
      info.processing = String(rec.processing).trim();
    }
    if (!isNullLikeValue(rec.elevation as string)) {
      info.elevation = String(rec.elevation).trim();
    }
    if (!isNullLikeValue(rec.farm as string)) {
      info.farm = String(rec.farm).trim();
    }
    if (!isNullLikeValue(rec.farmer as string)) {
      info.farmer = String(rec.farmer).trim();
    }

    // Percentage — handle numeric or string "60%"
    if (rec.percentage !== null) {
      if (typeof rec.percentage === 'number') {
        info.percentage = rec.percentage;
      } else if (!isNullLikeValue(String(rec.percentage))) {
        const pct = parseFloat(String(rec.percentage).replace('%', ''));
        if (!isNaN(pct)) {
          info.percentage = pct;
        }
      }
    }

    return info;
  }

  /**
   * Map roasting type string from JSON to BEAN_ROASTING_TYPE_ENUM.
   */
  private mapRoastingType(value: string): BEAN_ROASTING_TYPE_ENUM {
    switch (value.toUpperCase()) {
      case 'FILTER':
        return BEAN_ROASTING_TYPE_ENUM.FILTER;
      case 'ESPRESSO':
        return BEAN_ROASTING_TYPE_ENUM.ESPRESSO;
      case 'OMNI':
        return BEAN_ROASTING_TYPE_ENUM.OMNI;
      default:
        return BEAN_ROASTING_TYPE_ENUM.UNKNOWN;
    }
  }

  /**
   * Map bean mix string from JSON to BEAN_MIX_ENUM.
   */
  private mapBeanMix(value: string): BEAN_MIX_ENUM {
    switch (value.toUpperCase()) {
      case 'SINGLE_ORIGIN':
        return BEAN_MIX_ENUM.SINGLE_ORIGIN;
      case 'BLEND':
        return BEAN_MIX_ENUM.BLEND;
      default:
        return BEAN_MIX_ENUM.UNKNOWN;
    }
  }
}
