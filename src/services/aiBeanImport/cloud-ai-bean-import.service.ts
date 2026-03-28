import { inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { Bean } from '../../classes/bean/bean';
import { AI_PROVIDER_ENUM } from '../../enums/settings/aiProvider';
import { UIAlert } from '../uiAlert';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { AIImportStep, createAIBeanImportError } from './ai-bean-import-error';
import { AIReadinessResult } from './apple-intelligence-ai-bean-import.service';
import { CameraOcrService, MultiPassOcrResult } from './camera-ocr.service';
import { CloudFieldExtractionService } from './cloud-field-extraction.service';
import { OcrMetadataService } from './ocr-metadata.service';

@Injectable({
  providedIn: 'root',
})
export class CloudAIBeanImportService {
  private readonly uiAlert = inject(UIAlert);
  private readonly translate = inject(TranslateService);
  private readonly uiLog = inject(UILog);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly ocrMetadata = inject(OcrMetadataService);
  private readonly cloudFieldExtraction = inject(CloudFieldExtractionService);
  private readonly cameraOcr = inject(CameraOcrService);

  /**
   * Check if cloud AI is configured and ready to use.
   */
  public checkReadiness(): AIReadinessResult {
    const settings = this.uiSettingsStorage.getSettings();
    if (settings.ai_provider === AI_PROVIDER_ENUM.APPLE_INTELLIGENCE) {
      return {
        ready: false,
        message: this.translate.instant('APPLE_INTELLIGENCE_USE_ON_DEVICE'),
      };
    }
    if (settings.ai_provider === AI_PROVIDER_ENUM.NO_PROVIDER) {
      return {
        ready: false,
        message: this.translate.instant('CLOUD_AI_NOT_CONFIGURED'),
      };
    }
    if (!settings.cloud_ai_api_key || !settings.cloud_ai_model) {
      return {
        ready: false,
        message: this.translate.instant('CLOUD_AI_NOT_CONFIGURED'),
      };
    }
    return { ready: true };
  }

  /**
   * Capture a photo and extract bean data using OCR + Cloud LLM
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

      // Step 2: Enrich with layout metadata and extract via cloud LLM
      currentStep = 'cloud_api';
      const bean = await this.processOcrAndExtractBean([
        captureResult.ocrResult,
      ]);

      await this.uiAlert.hideLoadingSpinner();

      return bean;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error';
      this.uiLog.error(
        `Cloud AI Bean Import error at step [${currentStep}]: ${errorMessage}`,
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
   * Extract bean data from multiple photos using OCR + Cloud LLM.
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
      const { ocrResults } = await this.cameraOcr.ocrFromPhotoPaths(photoPaths);

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

      // Step 2: Enrich with layout metadata and extract via cloud LLM
      currentStep = 'cloud_api';
      const bean = await this.processOcrAndExtractBean(ocrResults);

      // Step 3: Handle photo attachments
      if (!attachPhotos) {
        await this.cameraOcr.cleanupPhotos(photoPaths);
        return { bean };
      }

      return { bean, attachmentPaths: photoPaths };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Unknown error';
      this.uiLog.error(
        `Cloud AI Multi-Photo Import error at step [${currentStep}]: ${errorMessage}`,
      );
      this.uiLog.error('Full error: ' + JSON.stringify(error));

      throw createAIBeanImportError(
        `[${currentStep}] ${errorMessage}`,
        currentStep,
        error,
      );
    }
  }

  /**
   * Shared pipeline for OCR post-processing and cloud field extraction.
   * Enriches OCR results with layout metadata, then sends to cloud LLM.
   */
  private async processOcrAndExtractBean(
    ocrResults: MultiPassOcrResult[],
  ): Promise<Bean> {
    // Step 1: Enrich with layout metadata (multi-pass aware)
    const enrichedText =
      ocrResults.length === 1
        ? this.ocrMetadata.enrichWithLayoutMultiPass(ocrResults[0]).enrichedText
        : this.ocrMetadata.enrichMultiplePhotosMultiPass(ocrResults);

    this.uiLog.log(`Cloud AI: Enriched text length: ${enrichedText.length}`);

    // Step 2: Extract fields via cloud LLM (no language detection or vocabulary needed)
    this.uiAlert.setLoadingSpinnerMessage(
      this.translate.instant('AI_IMPORT_STEP_ANALYZING'),
    );

    return this.cloudFieldExtraction.extractAllFields(enrichedText);
  }
}
