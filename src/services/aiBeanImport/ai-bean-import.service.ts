import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { UIAlert } from '../uiAlert';
import { UIFileHelper } from '../uiFileHelper';
import { UIImage } from '../uiImage';
import { UILog } from '../uiLog';
import { Bean } from '../../classes/bean/bean';
import {
  AI_IMPORT_PROMPT_TEMPLATE,
  AI_IMPORT_LANGUAGE_DETECTION_PROMPT,
} from '../../data/ai-import/ai-import-prompt';
import { AIImportExamplesService } from './ai-import-examples.service';
import { FieldExtractionService } from './field-extraction.service';
import {
  OcrMetadataService,
  TextDetectionResult,
} from './ocr-metadata.service';
import { CapgoLLM } from '@capgo/capacitor-llm';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';
import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';

export interface AIReadinessResult {
  ready: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AIBeanImportService {
  private static readonly ALLOWED_PROPERTIES = [
    'name',
    'roaster',
    'bean_roasting_type',
    'beanMix',
    'aromatics',
    'decaffeinated',
    'weight',
    'url',
    'cupping_points',
    'note',
    'bean_information',
  ];

  constructor(
    private readonly uiImage: UIImage,
    private readonly uiAlert: UIAlert,
    private readonly translate: TranslateService,
    private readonly platform: Platform,
    private readonly uiLog: UILog,
    private readonly aiImportExamples: AIImportExamplesService,
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
    let currentStep = 'init';
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
      currentStep = 'ocr_setup';
      this.uiAlert.setLoadingSpinnerMessage(
        this.translate.instant('AI_IMPORT_STEP_EXTRACTING'),
      );

      const base64Image = imageData.base64String;
      this.uiLog.log('Base64 image length: ' + (base64Image?.length || 0));

      currentStep = 'ocr';
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

      // Step 3: Enrich OCR with layout metadata
      currentStep = 'ocr_metadata';
      const enrichedResult = this.ocrMetadata.enrichWithLayout(ocrResult);
      this.uiLog.log(
        `OCR metadata: hasUsefulMetadata=${enrichedResult.hasUsefulMetadata}`,
      );
      if (enrichedResult.hasUsefulMetadata) {
        this.uiLog.log(
          'Enriched text preview: ' +
            enrichedResult.enrichedText.substring(0, 300),
        );
      }

      // Step 4: Detect language (on raw OCR text - layout tags would confuse detection)
      currentStep = 'language_detection';
      this.uiAlert.setLoadingSpinnerMessage(
        this.translate.instant('AI_IMPORT_STEP_DETECTING_LANGUAGE'),
      );

      const detectedLanguage = await this.detectLanguage(rawText);
      this.uiLog.log('Detected language: ' + detectedLanguage);

      // Step 5: Determine languages for examples
      const userLanguage = this.translate.currentLang;
      const languagesToUse = this.getLanguagesToUse(
        detectedLanguage,
        userLanguage,
      );
      this.uiLog.log(
        'Using languages for examples: ' + languagesToUse.join(', '),
      );

      // Step 6: Multi-step field extraction with pre/post-processing
      // Use enriched text (with layout metadata) for better name/roaster extraction
      currentStep = 'multi_step_extraction';
      console.log('=== STARTING FIELD EXTRACTION ===');
      console.log('extractedText:', enrichedResult.enrichedText);
      console.log('languagesToUse:', languagesToUse);
      this.uiAlert.setLoadingSpinnerMessage(
        this.translate.instant('AI_IMPORT_STEP_ANALYZING'),
      );

      const bean = await this.fieldExtraction.extractAllFields(
        enrichedResult.enrichedText,
        languagesToUse,
      );
      await this.uiAlert.hideLoadingSpinner();

      if (!bean) {
        throw new Error(
          'Field extraction returned null - check logs for details',
        );
      }

      return bean;
    } catch (error: any) {
      const errorMessage =
        error?.message || error?.toString() || 'Unknown error';
      this.uiLog.error(
        `AI Bean Import error at step [${currentStep}]: ${errorMessage}`,
      );
      this.uiLog.error('Full error: ' + JSON.stringify(error));
      await this.uiAlert.hideLoadingSpinner();

      // Re-throw with more context
      const detailedError = new Error(`[${currentStep}] ${errorMessage}`);
      (detailedError as any).step = currentStep;
      (detailedError as any).originalError = error;
      throw detailedError;
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
    let currentStep = 'init';
    try {
      // Step 1: Run OCR on each photo - collect full results including blocks
      currentStep = 'ocr';
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
          const ocrResult =
            (await CapacitorPluginMlKitTextRecognition.detectText({
              base64Image: base64,
            })) as TextDetectionResult;

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

      // Step 2: Enrich OCR with layout metadata for all photos
      currentStep = 'ocr_metadata';
      const enrichedText = this.ocrMetadata.enrichMultiplePhotos(ocrResults);
      this.uiLog.log(
        `Multi-photo OCR: Enriched text length: ${enrichedText.length}`,
      );

      // Concatenate raw texts for language detection (without layout tags)
      const combinedRawText = this.concatenateOCRResults(rawTexts);

      // Step 3: Detect language (on raw text - layout tags would confuse detection)
      currentStep = 'language_detection';
      this.uiAlert.setLoadingSpinnerMessage(
        this.translate.instant('AI_IMPORT_STEP_DETECTING_LANGUAGE'),
      );

      const detectedLanguage = await this.detectLanguage(combinedRawText);
      this.uiLog.log('Detected language: ' + detectedLanguage);

      // Step 4: Determine languages for examples
      const userLanguage = this.translate.currentLang;
      const languagesToUse = this.getLanguagesToUse(
        detectedLanguage,
        userLanguage,
      );
      this.uiLog.log(
        'Using languages for examples: ' + languagesToUse.join(', '),
      );

      // Step 5: Multi-step field extraction with layout-enriched text
      currentStep = 'multi_step_extraction';
      this.uiAlert.setLoadingSpinnerMessage(
        this.translate.instant('AI_IMPORT_STEP_ANALYZING'),
      );

      const bean = await this.fieldExtraction.extractAllFields(
        enrichedText,
        languagesToUse,
      );

      if (!bean) {
        // Clean up photos if not attaching
        if (!attachPhotos) {
          await this.cleanupPhotos(photoPaths);
        }
        throw new Error(
          'Field extraction returned null - check logs for details',
        );
      }

      // Step 6: Handle photo attachments
      if (!attachPhotos) {
        // Delete temp photos since user doesn't want attachments
        await this.cleanupPhotos(photoPaths);
        return { bean };
      }

      // Return bean with attachment paths
      return { bean, attachmentPaths: photoPaths };
    } catch (error: any) {
      const errorMessage =
        error?.message || error?.toString() || 'Unknown error';
      this.uiLog.error(
        `AI Multi-Photo Import error at step [${currentStep}]: ${errorMessage}`,
      );
      this.uiLog.error('Full error: ' + JSON.stringify(error));

      // Re-throw with more context
      const detailedError = new Error(`[${currentStep}] ${errorMessage}`);
      (detailedError as any).step = currentStep;
      (detailedError as any).originalError = error;
      throw detailedError;
    }
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
   * Send extracted text to LLM for analysis
   */
  private async analyzeTextWithLLM(
    ocrText: string,
    languages: string[],
  ): Promise<Bean | null> {
    try {
      // Set up Apple Intelligence model
      await CapgoLLM.setModel({ path: 'Apple Intelligence' });

      // Create chat session
      const { id: chatId } = await CapgoLLM.createChat();
      this.uiLog.log('Created chat with ID: ' + chatId);

      // Build the prompt with merged examples from specified languages
      const prompt = await this.buildPrompt(ocrText, languages);

      // Track the latest snapshot (plugin sends full content each time, not deltas)
      let latestSnapshot = '';
      let resolved = false;

      return new Promise<Bean | null>(async (resolve) => {
        const cleanup = async (textListener: any, finishedListener: any) => {
          try {
            await textListener?.remove();
            await finishedListener?.remove();
          } catch (e) {
            this.uiLog.error('Error cleaning up listeners: ' + e);
          }
        };

        const resolveOnce = async (
          bean: Bean | null,
          textListener: any,
          finishedListener: any,
        ) => {
          if (!resolved) {
            resolved = true;
            await cleanup(textListener, finishedListener);
            resolve(bean);
          }
        };

        // Listen for text chunks (snapshots contain full content so far)
        const textListener = await CapgoLLM.addListener(
          'textFromAi',
          (event: any) => {
            // Store the latest snapshot (not accumulating since these are full snapshots)
            if (event.text) {
              latestSnapshot = event.text;
            }
          },
        );

        // Listen for completion
        const finishedListener = await CapgoLLM.addListener(
          'aiFinished',
          async (event: any) => {
            this.uiLog.log(
              'aiFinished event received: ' + JSON.stringify(event),
            );
            this.uiLog.log('Latest snapshot length: ' + latestSnapshot.length);

            // Don't check chatId - just process when we get the finished signal
            if (latestSnapshot) {
              this.uiLog.log('LLM response: ' + latestSnapshot);

              try {
                const bean = this.createBeanFromResponse(latestSnapshot);
                await resolveOnce(bean, textListener, finishedListener);
              } catch (parseError) {
                this.uiLog.error('Failed to parse LLM response: ' + parseError);
                await resolveOnce(null, textListener, finishedListener);
              }
            } else {
              this.uiLog.error('aiFinished but no snapshot content received');
              await resolveOnce(null, textListener, finishedListener);
            }
          },
        );

        // Timeout fallback (30 seconds)
        setTimeout(async () => {
          if (!resolved && latestSnapshot) {
            this.uiLog.log('Timeout reached, using latest snapshot');
            try {
              const bean = this.createBeanFromResponse(latestSnapshot);
              await resolveOnce(bean, textListener, finishedListener);
            } catch (parseError) {
              this.uiLog.error('Timeout parse error: ' + parseError);
              await resolveOnce(null, textListener, finishedListener);
            }
          } else if (!resolved) {
            this.uiLog.error('Timeout with no response');
            await resolveOnce(null, textListener, finishedListener);
          }
        }, 30000);

        // Send message
        await CapgoLLM.sendMessage({
          chatId,
          message: prompt,
        });
      });
    } catch (error) {
      this.uiLog.error('LLM analysis error: ' + error);
      return null;
    }
  }

  /**
   * Detect the language of the OCR text using LLM
   */
  private async detectLanguage(ocrText: string): Promise<string | null> {
    try {
      // Set up Apple Intelligence model
      await CapgoLLM.setModel({ path: 'Apple Intelligence' });

      // Create chat session
      const { id: chatId } = await CapgoLLM.createChat();

      // Build the language detection prompt
      const prompt = AI_IMPORT_LANGUAGE_DETECTION_PROMPT.replace(
        '{{OCR_TEXT}}',
        ocrText,
      );

      // Track the latest snapshot
      let latestSnapshot = '';
      let resolved = false;

      return new Promise<string | null>(async (resolve) => {
        const cleanup = async (textListener: any, finishedListener: any) => {
          try {
            await textListener?.remove();
            await finishedListener?.remove();
          } catch (e) {
            this.uiLog.error('Error cleaning up listeners: ' + e);
          }
        };

        const resolveOnce = async (
          result: string | null,
          textListener: any,
          finishedListener: any,
        ) => {
          if (!resolved) {
            resolved = true;
            await cleanup(textListener, finishedListener);
            resolve(result);
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
            if (latestSnapshot) {
              const langCode = latestSnapshot.trim().toLowerCase();
              // Return detected language if valid, otherwise null
              if (langCode !== 'unknown' && langCode.length === 2) {
                await resolveOnce(langCode, textListener, finishedListener);
              } else {
                await resolveOnce(null, textListener, finishedListener);
              }
            } else {
              await resolveOnce(null, textListener, finishedListener);
            }
          },
        );

        // Timeout fallback (10 seconds for language detection)
        setTimeout(async () => {
          if (!resolved) {
            if (latestSnapshot) {
              const langCode = latestSnapshot.trim().toLowerCase();
              if (langCode !== 'unknown' && langCode.length === 2) {
                await resolveOnce(langCode, textListener, finishedListener);
              } else {
                await resolveOnce(null, textListener, finishedListener);
              }
            } else {
              await resolveOnce(null, textListener, finishedListener);
            }
          }
        }, 10000);

        // Send message
        await CapgoLLM.sendMessage({
          chatId,
          message: prompt,
        });
      });
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
   * Build the full prompt with merged examples from specified languages
   */
  private async buildPrompt(
    ocrText: string,
    languages: string[],
  ): Promise<string> {
    // Get merged examples from specified languages
    const examples = await this.aiImportExamples.getMergedExamples(languages);

    // Format detected languages as comma-separated ISO 639-1 codes
    const detectedLanguages = languages.join(', ');

    // Build the language-specific section with clearer "examples" framing
    const languageSection = `
Origin countries (examples): ${examples.ORIGINS}

Processing methods (examples): ${examples.PROCESSING_METHODS}

Varieties (examples): ${examples.VARIETIES}

Roasting type indicators:
- FILTER: ${examples.ROASTING_TYPE_FILTER_KEYWORDS}
- ESPRESSO: ${examples.ROASTING_TYPE_ESPRESSO_KEYWORDS}
- OMNI: ${examples.ROASTING_TYPE_OMNI_KEYWORDS}

Other indicators:
- Decaf: ${examples.DECAF_KEYWORDS}
- Blend: ${examples.BLEND_KEYWORDS}
- Single Origin: ${examples.SINGLE_ORIGIN_KEYWORDS}
`;

    return AI_IMPORT_PROMPT_TEMPLATE.replace(
      '{{DETECTED_LANGUAGES}}',
      detectedLanguages,
    )
      .replace('{{LANGUAGE_SPECIFIC_EXAMPLES}}', languageSection)
      .replace('{{OCR_TEXT}}', ocrText);
  }

  /**
   * Parse JSON response from LLM and create a Bean object
   */
  private createBeanFromResponse(llmResponse: string): Bean | null {
    // Try to extract JSON from the response
    let jsonStr = llmResponse.trim();

    // If response contains markdown code blocks, extract JSON
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // Parse JSON
    const extracted = JSON.parse(jsonStr);

    // Create Bean with defaults
    const bean = new Bean();

    // Assign only non-null extracted properties from allowed list
    for (const key of AIBeanImportService.ALLOWED_PROPERTIES) {
      const value = extracted[key];
      if (value !== null && value !== undefined) {
        (bean as any)[key] = value;
      }
    }

    // Ensure bean_information has at least one entry if data was extracted
    if (
      extracted.bean_information &&
      Array.isArray(extracted.bean_information) &&
      extracted.bean_information.length > 0
    ) {
      bean.bean_information = extracted.bean_information.filter(
        (info: any) => info !== null,
      );
    }

    return bean;
  }
}
