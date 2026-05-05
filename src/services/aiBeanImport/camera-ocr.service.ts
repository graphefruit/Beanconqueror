import { inject, Injectable } from '@angular/core';

import { CameraDirection, CameraResultType, CameraSource } from '@capacitor/camera';
import { TranslateService } from '@ngx-translate/core';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';

import { UIAlert } from '../uiAlert';
import { UIFileHelper } from '../uiFileHelper';
import { UIImage } from '../uiImage';
import { UILog } from '../uiLog';
import { rotateBase64Image } from './image-rotation';
import { TextDetectionResult } from './ocr-metadata.service';
import { CAMERA_SERVICE_PORT, CameraServicePort } from '../../app/platform/ports/camera-service.port';

/**
 * Result of multi-pass OCR on a single image.
 * The primary result (0°) is always present.
 * Rotated results (90°/270°) are only present when they found text.
 */
export interface MultiPassOcrResult {
  /** OCR result from the original (0°) image */
  primary: TextDetectionResult;
  /** OCR results from rotated passes (90°, 270°) — only those that found text */
  rotated: TextDetectionResult[];
}

export interface SinglePhotoCaptureResult {
  ocrResult: MultiPassOcrResult;
  rawText: string;
}

export interface MultiPhotoOcrResult {
  ocrResults: MultiPassOcrResult[];
  rawTexts: string[];
}

/**
 * Combine all text from a multi-pass OCR result (primary + rotated passes).
 */
export function collectRawText(result: MultiPassOcrResult): string {
  return [result.primary.text, ...result.rotated.map((r) => r.text)]
    .filter((t) => t.trim())
    .join('\n');
}

@Injectable({
  providedIn: 'root',
})
export class CameraOcrService {
  private readonly uiImage = inject(UIImage);
  private readonly uiAlert = inject(UIAlert);
  private readonly translate = inject(TranslateService);
  private readonly uiLog = inject(UILog);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly cameraService = inject(CAMERA_SERVICE_PORT) as CameraServicePort;

  /**
   * Capture a photo and run OCR on it.
   * Shows a loading spinner during capture and OCR.
   * Returns null if permission denied, user cancels, or no text found.
   * On success the spinner remains visible — caller must hide it.
   */
  async captureAndOcr(): Promise<SinglePhotoCaptureResult | null> {
    await this.uiAlert.showLoadingSpinner('AI_IMPORT_STEP_CAPTURING', true);

    const hasPermission = await this.uiImage.checkCameraPermission();
    if (!hasPermission) {
      await this.uiAlert.hideLoadingSpinner();
      return null;
    }

    if (!this.cameraService.isSupported()) {
      await this.uiAlert.hideLoadingSpinner();
      await this.uiAlert.showMessage('FEATURE_REQUIRES_MOBILE_APP', 'AI_IMPORT_NOT_AVAILABLE', undefined, true);
      return null;
    }

    const imageData = await this.cameraService.getPhoto({
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
    this.uiAlert.setLoadingSpinnerMessage(
      this.translate.instant('AI_IMPORT_STEP_EXTRACTING'),
    );

    const ocrResult = await this.ocrWithRotations(imageData.base64String);
    const rawText = collectRawText(ocrResult);
    if (!rawText) {
      await this.uiAlert.hideLoadingSpinner();
      await this.uiAlert.showMessage(
        'AI_IMPORT_NO_TEXT_FOUND',
        'AI_IMPORT_NOT_AVAILABLE',
        undefined,
        true,
      );
      return null;
    }

    this.uiLog.log('CameraOcr: OCR extracted text: ' + rawText);

    return { ocrResult, rawText };
  }

  /**
   * Run OCR on multiple photo files.
   * Updates the loading spinner message per photo.
   * Returns only photos that produced text.
   */
  async ocrFromPhotoPaths(photoPaths: string[]): Promise<MultiPhotoOcrResult> {
    const ocrResults: MultiPassOcrResult[] = [];
    const rawTexts: string[] = [];

    for (let i = 0; i < photoPaths.length; i++) {
      this.uiAlert.setLoadingSpinnerMessage(
        this.translate.instant('AI_IMPORT_MULTI_PROCESSING_PHOTO', {
          current: i + 1,
          total: photoPaths.length,
        }),
      );

      const photoPath = photoPaths[i];

      let base64: string;
      try {
        base64 = await this.uiFileHelper.readInternalFileAsBase64(photoPath);
      } catch (readError: unknown) {
        const msg =
          readError instanceof Error ? readError.message : String(readError);
        this.uiLog.error(
          `CameraOcr: Failed to read photo ${i + 1} at path ${photoPath}: ${msg}`,
        );
        continue;
      }

      if (!base64 || base64.length < 1000) {
        this.uiLog.error(
          `CameraOcr: Photo ${i + 1} has suspiciously short base64 (${base64?.length || 0} chars), skipping`,
        );
        continue;
      }

      try {
        const ocrResult = await this.ocrWithRotations(base64);

        const rawText = collectRawText(ocrResult);
        if (rawText) {
          ocrResults.push(ocrResult);
          rawTexts.push(rawText);
        } else {
          this.uiLog.log(`CameraOcr: Photo ${i + 1} had no text`);
        }
      } catch (ocrError: unknown) {
        const msg =
          ocrError instanceof Error ? ocrError.message : String(ocrError);
        this.uiLog.error(`CameraOcr: OCR failed for photo ${i + 1}: ${msg}`);
        continue;
      }
    }

    return { ocrResults, rawTexts };
  }

  /**
   * Run OCR on a base64 image at 0°, 90°, and 270°.
   * Returns the primary (0°) result and any rotated results that found text.
   */
  private async ocrWithRotations(base64: string): Promise<MultiPassOcrResult> {
    // Primary pass (0°)
    // ML Kit plugin returns this shape but its TS types are wider
    const primary = (await CapacitorPluginMlKitTextRecognition.detectText({
      base64Image: base64,
    })) as TextDetectionResult;

    const rotated: TextDetectionResult[] = [];

    // Rotated passes — only if primary succeeded (image is valid)
    for (const degrees of [90, 270] as const) {
      try {
        const rotatedBase64 = await rotateBase64Image(base64, degrees);
        // ML Kit plugin returns this shape but its TS types are wider
        const result = (await CapacitorPluginMlKitTextRecognition.detectText({
          base64Image: rotatedBase64,
        })) as TextDetectionResult;

        if (result.text && result.text.trim() !== '') {
          rotated.push(result);
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.uiLog.error(`CameraOcr: Rotated ${degrees}° pass failed: ${msg}`);
      }
    }

    return { primary, rotated };
  }

  /**
   * Delete temporary photo files.
   */
  async cleanupPhotos(photoPaths: string[]): Promise<void> {
    for (const path of photoPaths) {
      try {
        await this.uiFileHelper.deleteInternalFile(path);
      } catch (e) {
        this.uiLog.error('CameraOcr: Failed to delete temp photo: ' + e);
      }
    }
  }
}
