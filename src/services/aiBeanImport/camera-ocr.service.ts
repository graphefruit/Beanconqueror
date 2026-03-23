import { inject, Injectable } from '@angular/core';

import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import { TranslateService } from '@ngx-translate/core';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';

import { UIAlert } from '../uiAlert';
import { UIFileHelper } from '../uiFileHelper';
import { UIImage } from '../uiImage';
import { UILog } from '../uiLog';
import { TextDetectionResult } from './ocr-metadata.service';

export interface SinglePhotoCaptureResult {
  ocrResult: TextDetectionResult;
  rawText: string;
}

export interface MultiPhotoOcrResult {
  ocrResults: TextDetectionResult[];
  rawTexts: string[];
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
      'CameraOcr: Photo captured, base64 length: ' +
        imageData.base64String.length,
    );

    this.uiAlert.setLoadingSpinnerMessage(
      this.translate.instant('AI_IMPORT_STEP_EXTRACTING'),
    );

    const ocrResult = (await CapacitorPluginMlKitTextRecognition.detectText({
      base64Image: imageData.base64String,
    })) as TextDetectionResult;
    const rawText = ocrResult.text;
    this.uiLog.log(
      'CameraOcr: OCR result: ' + JSON.stringify(ocrResult).substring(0, 500),
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

    this.uiLog.log('CameraOcr: OCR extracted text: ' + rawText);

    return { ocrResult, rawText };
  }

  /**
   * Run OCR on multiple photo files.
   * Updates the loading spinner message per photo.
   * Returns only photos that produced text.
   */
  async ocrFromPhotoPaths(photoPaths: string[]): Promise<MultiPhotoOcrResult> {
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
        `CameraOcr: Processing photo ${i + 1}/${photoPaths.length}, path: ${photoPath}`,
      );

      let base64: string;
      try {
        base64 = await this.uiFileHelper.readInternalFileAsBase64(photoPath);
        this.uiLog.log(
          `CameraOcr: Photo ${i + 1} read successfully, base64 length: ${base64.length}`,
        );
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
        const ocrResult = (await CapacitorPluginMlKitTextRecognition.detectText(
          {
            base64Image: base64,
          },
        )) as TextDetectionResult;

        this.uiLog.log(
          `CameraOcr: Photo ${i + 1} OCR result: ${JSON.stringify(ocrResult).substring(0, 200)}`,
        );

        if (ocrResult.text && ocrResult.text.trim() !== '') {
          ocrResults.push(ocrResult);
          rawTexts.push(ocrResult.text);
          this.uiLog.log(
            `CameraOcr: Photo ${i + 1} extracted ${ocrResult.text.length} chars`,
          );
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
   * Delete temporary photo files.
   */
  async cleanupPhotos(photoPaths: string[]): Promise<void> {
    for (const path of photoPaths) {
      try {
        await this.uiFileHelper.deleteInternalFile(path);
        this.uiLog.log('CameraOcr: Deleted temp photo: ' + path);
      } catch (e) {
        this.uiLog.error('CameraOcr: Failed to delete temp photo: ' + e);
      }
    }
  }
}
