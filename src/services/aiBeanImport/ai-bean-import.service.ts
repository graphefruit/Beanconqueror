import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { UIAlert } from '../uiAlert';
import { UIImage } from '../uiImage';
import { UILog } from '../uiLog';
import { Bean } from '../../classes/bean/bean';
import { AI_IMPORT_PROMPT_TEMPLATE } from '../../data/ai-import/ai-import-prompt';
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
      const ocrResult = await CapacitorPluginMlKitTextRecognition.detectText({
        base64Image: base64Image,
      });
      const extractedText = ocrResult.text;
      this.uiLog.log(
        'OCR result: ' + JSON.stringify(ocrResult).substring(0, 500),
      );

      if (!extractedText || extractedText.trim() === '') {
        await this.uiAlert.hideLoadingSpinner();
        await this.uiAlert.showMessage(
          'AI_IMPORT_NO_TEXT_FOUND',
          'AI_IMPORT_NOT_AVAILABLE',
          undefined,
          true,
        );
        return null;
      }

      this.uiLog.log('OCR extracted text: ' + extractedText);

      // Step 3: Analyze with AI
      currentStep = 'llm_analysis';
      this.uiAlert.setLoadingSpinnerMessage(
        this.translate.instant('AI_IMPORT_STEP_ANALYZING'),
      );

      const bean = await this.analyzeTextWithLLM(extractedText);
      await this.uiAlert.hideLoadingSpinner();

      if (!bean) {
        throw new Error('LLM returned null - check logs for details');
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
   * Send extracted text to LLM for analysis
   */
  private async analyzeTextWithLLM(ocrText: string): Promise<Bean | null> {
    try {
      // Set up Apple Intelligence model
      await CapgoLLM.setModel({ path: 'Apple Intelligence' });

      // Create chat session
      const { id: chatId } = await CapgoLLM.createChat();
      this.uiLog.log('Created chat with ID: ' + chatId);

      // Build the prompt
      const prompt = this.buildPrompt(ocrText);

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
   * Build the full prompt with language-specific examples
   */
  private buildPrompt(ocrText: string): string {
    // Get language-specific examples from i18n
    const examples = this.translate.instant('AI_IMPORT_PROMPT_EXAMPLES');

    // Build the language-specific section
    const languageSection = `
COMMON PROCESSING METHODS (recognize these terms):
${examples.PROCESSING_METHODS || 'Washed, Natural, Honey, Anaerobic, Carbonic Maceration, Wet-Hulled, Semi-Washed, Pulped Natural'}

PROCESSING MAPPING:
${examples.PROCESSING_MAPPING || 'Washed/Wet Process → Washed, Natural/Dry Process/Unwashed → Natural, Honey/Pulped Natural → Honey'}

COMMON COFFEE VARIETIES:
${examples.VARIETIES || 'Typica, Bourbon, Caturra, Catuai, Mundo Novo, Gesha/Geisha, SL28, SL34, Pacamara, Maragogype, Yellow Bourbon, Red Bourbon, Pink Bourbon, Castillo, Colombia, Tabi, Ethiopian Heirloom, Sidra, Wush Wush'}

BEAN ROASTING TYPE KEYWORDS:
- FILTER: ${examples.ROASTING_TYPE_FILTER_KEYWORDS || 'Filter Roast, for filter, pour over, light roast, filter coffee'}
- ESPRESSO: ${examples.ROASTING_TYPE_ESPRESSO_KEYWORDS || 'Espresso Roast, for espresso, dark roast, espresso blend'}
- OMNI: ${examples.ROASTING_TYPE_OMNI_KEYWORDS || 'Omni Roast, versatile, all brewing methods, medium roast, all-rounder'}

DECAF KEYWORDS: ${examples.DECAF_KEYWORDS || 'Decaf, Decaffeinated, Caffeine-free'}
BLEND KEYWORDS: ${examples.BLEND_KEYWORDS || 'Blend, House Blend, Espresso Blend'}
SINGLE ORIGIN KEYWORDS: ${examples.SINGLE_ORIGIN_KEYWORDS || 'Single Origin, Single Estate, Single Farm'}
`;

    return AI_IMPORT_PROMPT_TEMPLATE.replace(
      '{{LANGUAGE_SPECIFIC_EXAMPLES}}',
      languageSection,
    ).replace('{{OCR_TEXT}}', ocrText);
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
