import { Injectable, isDevMode } from '@angular/core';

import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import { CapgoLLM } from '@capgo/capacitor-llm';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';

import { Bean } from '../../classes/bean/bean';
import { LLM_TIMEOUT_LANGUAGE_DETECTION_MS } from '../../data/ai-import/ai-import-constants';
import { AI_IMPORT_LANGUAGE_DETECTION_PROMPT } from '../../data/ai-import/ai-import-prompt';
import { UIAlert } from '../uiAlert';
import { UIFileHelper } from '../uiFileHelper';
import { UIImage } from '../uiImage';
import { UILog } from '../uiLog';

import { AIImportStep, createAIBeanImportError } from './ai-bean-import-error';
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
  constructor(
    private readonly uiImage: UIImage,
    private readonly uiAlert: UIAlert,
    private readonly translate: TranslateService,
    private readonly platform: Platform,
    private readonly uiLog: UILog,
    private readonly fieldExtraction: FieldExtractionService,
    private readonly uiFileHelper: UIFileHelper,
    private readonly ocrMetadata: OcrMetadataService,
  ) {}

  /**
   * Check if the device supports AI-based import (Apple Intelligence on iOS 18.1+)
   */
  public async checkReadiness(): Promise<AIReadinessResult> {
    // Only available on capacitor (mobile devices)
    if (!this.platform.is('capacitor')) {
      return {
        ready: false,
        message: this.translate.instant('AI_IMPORT_NOT_AVAILABLE_BROWSER'),
      };
    }

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
      // Step 1: Capture image
      currentStep = 'camera_permission';
      await this.uiAlert.showLoadingSpinner('AI_IMPORT_STEP_CAPTURING', true);

      const hasPermission = await this.uiImage.checkCameraPermission();
      if (!hasPermission) {
        await this.uiAlert.hideLoadingSpinner();
        return null;
      }

      currentStep = 'take_photo';
      // Get photo directly as base64 from camera (skip intermediate file save)
      const imageData = await Camera.getPhoto({
        correctOrientation: true,
        direction: CameraDirection.Rear,
        quality: 90,
        resultType: CameraResultType.Base64,
        saveToGallery: false,
        source: CameraSource.Camera,
      });

      if (!imageData?.base64String) {
        await this.uiAlert.hideLoadingSpinner();
        return null;
      }
      this.uiLog.log(
        'Photo captured, base64 length: ' + imageData.base64String.length,
      );

      // Step 2: Run OCR
      currentStep = 'ocr';
      this.uiAlert.setLoadingSpinnerMessage(
        this.translate.instant('AI_IMPORT_STEP_EXTRACTING'),
      );

      const base64Image = imageData.base64String;
      this.uiLog.log('Base64 image length: ' + (base64Image?.length || 0));

      const ocrResult = (await CapacitorPluginMlKitTextRecognition.detectText({
        base64Image: base64Image,
      })) as TextDetectionResult;
      const rawText = ocrResult.text;
      this.uiLog.log(
        'OCR result: ' + JSON.stringify(ocrResult).substring(0, 500),
      );

      if (!rawText || rawText.trim() === '') {
        await this.uiAlert.hideLoadingSpinner();
        await this.uiAlert.showMessage(
          'AI_IMPORT_NO_TEXT_FOUND',
          'AI_IMPORT_NOT_AVAILABLE',
          undefined,
          true,
        );
        return null;
      }

      this.uiLog.log('OCR extracted text: ' + rawText);

      // Step 3: Shared processing pipeline (enrich → detect language → extract fields)
      currentStep = 'processing';
      const bean = await this.processOcrAndExtractBean([ocrResult], [rawText]);

      await this.uiAlert.hideLoadingSpinner();

      if (!bean) {
        throw new Error(
          'Field extraction returned null - check logs for details',
        );
      }

      return bean;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.uiLog.error(
        `AI Bean Import error at step [${currentStep}]: ${errorMessage}`,
      );
      this.uiLog.error('Full error: ' + JSON.stringify(error));
      await this.uiAlert.hideLoadingSpinner();

      // Re-throw with more context
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
      const { ocrResults, rawTexts } = await this.runOcrOnPhotos(photoPaths);

      // Check if we got any text at all
      if (ocrResults.length === 0) {
        await this.uiAlert.hideLoadingSpinner();
        await this.uiAlert.showMessage(
          'AI_IMPORT_NO_TEXT_FOUND',
          'AI_IMPORT_NOT_AVAILABLE',
          undefined,
          true,
        );

        // Clean up photos if not attaching
        if (!attachPhotos) {
          await this.cleanupPhotos(photoPaths);
        }
        return null;
      }

      // Step 2: Shared processing pipeline (enrich → detect language → extract fields)
      currentStep = 'processing';
      const bean = await this.processOcrAndExtractBean(ocrResults, rawTexts);

      if (!bean) {
        // Clean up photos if not attaching
        if (!attachPhotos) {
          await this.cleanupPhotos(photoPaths);
        }
        throw new Error(
          'Field extraction returned null - check logs for details',
        );
      }

      // Step 3: Handle photo attachments
      if (!attachPhotos) {
        // Delete temp photos since user doesn't want attachments
        await this.cleanupPhotos(photoPaths);
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
    this.debugLog('enrichedText', enrichedText);

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
    this.debugLog('STARTING FIELD EXTRACTION');
    this.debugLog('languagesToUse', languagesToUse);
    this.uiAlert.setLoadingSpinnerMessage(
      this.translate.instant('AI_IMPORT_STEP_ANALYZING'),
    );

    const bean = await this.fieldExtraction.extractAllFields(
      enrichedText,
      languagesToUse,
    );

    if (!bean) {
      throw new Error(
        'Field extraction returned null - check logs for details',
      );
    }

    return bean;
  }

  /**
   * Run OCR on multiple photos and collect results.
   * Handles errors gracefully, skipping failed photos.
   */
  private async runOcrOnPhotos(
    photoPaths: string[],
  ): Promise<{ ocrResults: TextDetectionResult[]; rawTexts: string[] }> {
    const ocrResults: TextDetectionResult[] = [];
    const rawTexts: string[] = [];

    for (let i = 0; i < photoPaths.length; i++) {
      this.uiAlert.setLoadingSpinnerMessage(
        this.translate.instant('AI_IMPORT_MULTI_PROCESSING_PHOTO', {
          current: i + 1,
          total: photoPaths.length,
        }),
      );

      const photoPath = photoPaths[i];
      this.uiLog.log(
        `Multi-photo OCR: Processing photo ${i + 1}/${photoPaths.length}, path: ${photoPath}`,
      );

      // Read file as base64 for OCR
      let base64: string;
      try {
        base64 = await this.uiFileHelper.readInternalFileAsBase64(photoPath);
        this.uiLog.log(
          `Multi-photo OCR: Photo ${i + 1} read successfully, base64 length: ${base64.length}, first 50 chars: ${base64.substring(0, 50)}`,
        );
      } catch (readError: any) {
        this.uiLog.error(
          `Multi-photo OCR: Failed to read photo ${i + 1} at path ${photoPath}: ${readError?.message || readError}`,
        );
        continue; // Skip this photo but try others
      }

      // Validate base64 looks like image data
      if (!base64 || base64.length < 1000) {
        this.uiLog.error(
          `Multi-photo OCR: Photo ${i + 1} has suspiciously short base64 (${base64?.length || 0} chars), skipping`,
        );
        continue;
      }

      try {
        const ocrResult = (await CapacitorPluginMlKitTextRecognition.detectText(
          {
            base64Image: base64,
          },
        )) as TextDetectionResult;

        this.uiLog.log(
          `Multi-photo OCR: Photo ${i + 1} OCR result: ${JSON.stringify(ocrResult).substring(0, 200)}`,
        );

        if (ocrResult.text && ocrResult.text.trim() !== '') {
          ocrResults.push(ocrResult);
          rawTexts.push(ocrResult.text);
          this.uiLog.log(
            `Multi-photo OCR: Photo ${i + 1} extracted ${ocrResult.text.length} chars: "${ocrResult.text.substring(0, 100)}..."`,
          );
        } else {
          this.uiLog.log(`Multi-photo OCR: Photo ${i + 1} had no text`);
        }
      } catch (ocrError: any) {
        this.uiLog.error(
          `Multi-photo OCR: OCR failed for photo ${i + 1}: ${ocrError?.message || ocrError}`,
        );
        continue;
      }
    }

    return { ocrResults, rawTexts };
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
   * Clean up temporary photo files
   */
  private async cleanupPhotos(photoPaths: string[]): Promise<void> {
    for (const path of photoPaths) {
      try {
        await this.uiFileHelper.deleteInternalFile(path);
        this.uiLog.log('Deleted temp photo: ' + path);
      } catch (e) {
        this.uiLog.error('Failed to delete temp photo: ' + e);
      }
    }
  }

  /**
   * Detect the language of the OCR text using LLM
   */
  private async detectLanguage(ocrText: string): Promise<string | null> {
    try {
      // Build the language detection prompt
      const prompt = AI_IMPORT_LANGUAGE_DETECTION_PROMPT.replace(
        '{{OCR_TEXT}}',
        ocrText,
      );

      // Send to LLM with timeout for language detection
      const response = await sendLLMPrompt(prompt, {
        timeoutMs: LLM_TIMEOUT_LANGUAGE_DETECTION_MS,
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
    const languages: string[] = [];
    const seen = new Set<string>();

    // Helper to add unique language
    const addLang = (lang: string) => {
      if (lang && !seen.has(lang)) {
        seen.add(lang);
        languages.push(lang);
      }
    };

    // 1. Detected language first (highest probability)
    if (detectedLang) {
      addLang(detectedLang);
    }

    // 2. English second (universal fallback, coffee industry lingua franca)
    addLang('en');

    // 3. UI language third (user's preference, may match text)
    addLang(userLang);

    return languages;
  }

  /**
   * Debug logging helper - only logs in development mode.
   * Verbose output goes to console in dev mode.
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
