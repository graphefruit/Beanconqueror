import { inject, Injectable } from '@angular/core';

import { Platform } from '@ionic/angular/standalone';

import { CapgoLLM } from '@capgo/capacitor-llm';
import { TranslateService } from '@ngx-translate/core';

import { Bean } from '../../classes/bean/bean';
import { LLM_TIMEOUT_LANGUAGE_DETECTION_MS } from '../../data/ai-import/ai-import-constants';
import {
  AI_IMPORT_LANGUAGE_DETECTION_PROMPT,
  LANGUAGE_DETECTION_INSTRUCTIONS,
} from '../../data/ai-import/ai-import-prompt';
import { UIAlert } from '../uiAlert';
import { UILog } from '../uiLog';
import { AIImportStep, createAIBeanImportError } from './ai-bean-import-error';
import { AIImportExamplesService } from './ai-import-examples.service';
import { CameraOcrService } from './camera-ocr.service';
import { FieldExtractionService } from './field-extraction.service';
import { sendLLMPrompt } from './llm-communication.service';
import {
  OcrMetadataService,
  TextDetectionResult,
} from './ocr-metadata.service';

export interface AIReadinessResult {
  ready: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AIBeanImportService {
  private readonly uiAlert = inject(UIAlert);
  private readonly translate = inject(TranslateService);
  private readonly platform = inject(Platform);
  private readonly uiLog = inject(UILog);
  private readonly fieldExtraction = inject(FieldExtractionService);
  private readonly ocrMetadata = inject(OcrMetadataService);
  private readonly aiImportExamples = inject(AIImportExamplesService);
  private readonly cameraOcr = inject(CameraOcrService);

  /**
   * Check if the device supports AI-based import (Apple Intelligence on iOS 18.1+)
   */
  public async checkReadiness(): Promise<AIReadinessResult> {
    // Android is not supported in the initial version
    if (this.platform.is('android')) {
      return {
        ready: false,
        message: this.translate.instant('AI_IMPORT_NOT_AVAILABLE_ANDROID'),
      };
    }

    // Check Apple Intelligence readiness on iOS
    try {
      const result = await CapgoLLM.getReadiness();
      this.uiLog.log('AI Readiness check result: ' + JSON.stringify(result));

      // Check if the readiness status indicates the LLM is ready
      if (result.readiness === 'ready') {
        return { ready: true };
      } else {
        return {
          ready: false,
          message: this.translate.instant(
            'AI_IMPORT_REQUIRES_APPLE_INTELLIGENCE',
          ),
        };
      }
    } catch (error) {
      this.uiLog.error('Error checking AI readiness: ' + error);
      return {
        ready: false,
        message: this.translate.instant(
          'AI_IMPORT_REQUIRES_APPLE_INTELLIGENCE',
        ),
      };
    }
  }

  /**
   * Capture a photo and extract bean data using OCR + LLM
   */
  public async captureAndExtractBeanData(): Promise<Bean | null> {
    let currentStep: AIImportStep = 'init';
    try {
      // Step 1: Capture image and run OCR
      currentStep = 'camera_permission';
      const captureResult = await this.cameraOcr.captureAndOcr();
      if (!captureResult) {
        return null;
      }

      // Step 2: Shared processing pipeline (enrich → detect language → extract fields)
      currentStep = 'processing';
      const bean = await this.processOcrAndExtractBean(
        [captureResult.ocrResult],
        [captureResult.rawText],
      );

      await this.uiAlert.hideLoadingSpinner();

      return bean;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.uiLog.error(
        `AI Bean Import error at step [${currentStep}]: ${errorMessage}`,
      );
      this.uiLog.error('Full error: ' + JSON.stringify(error));
      await this.uiAlert.hideLoadingSpinner();

      throw createAIBeanImportError(
        `[${currentStep}] ${errorMessage}`,
        currentStep,
        error,
      );
    }
  }

  /**
   * Extract bean data from multiple photos using OCR + LLM.
   * Photos are processed sequentially, OCR text is concatenated, then field extraction runs.
   *
   * @param photoPaths Array of file paths to process
   * @param attachPhotos Whether to keep photos for attachment to the bean
   * @returns Bean with optional attachment paths, or null if extraction failed
   */
  public async extractBeanDataFromImages(
    photoPaths: string[],
    attachPhotos: boolean,
  ): Promise<{ bean: Bean; attachmentPaths?: string[] } | null> {
    let currentStep: AIImportStep = 'init';
    try {
      // Step 1: Run OCR on all photos
      currentStep = 'ocr';
      const { ocrResults, rawTexts } =
        await this.cameraOcr.ocrFromPhotoPaths(photoPaths);

      // Check if we got any text at all
      if (ocrResults.length === 0) {
        await this.uiAlert.hideLoadingSpinner();
        await this.uiAlert.showMessage(
          'AI_IMPORT_NO_TEXT_FOUND',
          'AI_IMPORT_NOT_AVAILABLE',
          undefined,
          true,
        );

        if (!attachPhotos) {
          await this.cameraOcr.cleanupPhotos(photoPaths);
        }
        return null;
      }

      // Step 2: Shared processing pipeline (enrich → detect language → extract fields)
      currentStep = 'processing';
      const bean = await this.processOcrAndExtractBean(ocrResults, rawTexts);

      // Step 3: Handle photo attachments
      if (!attachPhotos) {
        await this.cameraOcr.cleanupPhotos(photoPaths);
        return { bean };
      }

      // Return bean with attachment paths
      return { bean, attachmentPaths: photoPaths };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.uiLog.error(
        `AI Multi-Photo Import error at step [${currentStep}]: ${errorMessage}`,
      );
      this.uiLog.error('Full error: ' + JSON.stringify(error));

      // Re-throw with more context
      throw createAIBeanImportError(
        `[${currentStep}] ${errorMessage}`,
        currentStep,
        error,
      );
    }
  }

  /**
   * Shared pipeline for OCR post-processing and field extraction.
   * Takes OCR result(s), enriches with layout, detects language, and extracts fields.
   */
  private async processOcrAndExtractBean(
    ocrResults: TextDetectionResult[],
    rawTexts: string[],
  ): Promise<Bean> {
    // Step 1: Enrich with layout metadata
    const enrichedText =
      ocrResults.length === 1
        ? this.ocrMetadata.enrichWithLayout(ocrResults[0]).enrichedText
        : this.ocrMetadata.enrichMultiplePhotos(ocrResults);

    this.uiLog.log(`Enriched text length: ${enrichedText.length}`);

    // Step 2: Prepare raw text for language detection
    const combinedRawText = this.concatenateOCRResults(rawTexts);

    // Step 3: Detect language (on raw text - layout tags would confuse detection)
    this.uiAlert.setLoadingSpinnerMessage(
      this.translate.instant('AI_IMPORT_STEP_DETECTING_LANGUAGE'),
    );
    const detectedLanguage = await this.detectLanguage(combinedRawText);
    this.uiLog.log('Detected language: ' + detectedLanguage);

    // Step 4: Get languages for examples
    const userLanguage = this.translate.currentLang;
    const languagesToUse = this.getLanguagesToUse(
      detectedLanguage,
      userLanguage,
    );
    this.uiLog.log(
      'Using languages for examples: ' + languagesToUse.join(', '),
    );

    // Step 5: Extract fields
    this.uiAlert.setLoadingSpinnerMessage(
      this.translate.instant('AI_IMPORT_STEP_ANALYZING'),
    );

    return this.fieldExtraction.extractAllFields(enrichedText, languagesToUse);
  }

  /**
   * Concatenate OCR results from multiple photos with section markers.
   * For single photo, returns text as-is without markers.
   */
  private concatenateOCRResults(ocrTexts: string[]): string {
    if (ocrTexts.length === 1) {
      return ocrTexts[0];
    }

    return ocrTexts
      .map((text, i) => `--- Label ${i + 1} of ${ocrTexts.length} ---\n${text}`)
      .join('\n\n');
  }

  /**
   * Detect the language of the OCR text using LLM
   */
  private async detectLanguage(ocrText: string): Promise<string | null> {
    try {
      // Load language detection keywords from i18n
      const languageIndicators =
        await this.aiImportExamples.getLanguageDetectionKeywords();

      // Build the language detection prompt
      const prompt = AI_IMPORT_LANGUAGE_DETECTION_PROMPT.replace(
        '{{LANGUAGE_INDICATORS}}',
        languageIndicators,
      ).replace('{{OCR_TEXT}}', ocrText);

      // Send to LLM with timeout for language detection
      const response = await sendLLMPrompt(prompt, {
        timeoutMs: LLM_TIMEOUT_LANGUAGE_DETECTION_MS,
        instructions: LANGUAGE_DETECTION_INSTRUCTIONS,
        logger: this.uiLog,
      });

      if (response) {
        const langCode = response.trim().toLowerCase();
        // Return detected language if valid, otherwise null
        if (langCode !== 'unknown' && langCode.length === 2) {
          return langCode;
        }
      }

      return null;
    } catch (error) {
      this.uiLog.error('Language detection error: ' + error);
      return null;
    }
  }

  /**
   * Determine which languages to use for examples, ordered by probability.
   * Order: detected language (most likely) → English (fallback) → UI language
   */
  private getLanguagesToUse(
    detectedLang: string | null,
    userLang: string,
  ): string[] {
    const langs = new Set<string>();

    // 1. Detected language first (highest probability)
    if (detectedLang) {
      langs.add(detectedLang);
    }

    // 2. English second (universal fallback, coffee industry lingua franca)
    langs.add('en');

    // 3. UI language third (user's preference, may match text)
    langs.add(userLang);

    return Array.from(langs);
  }
}
