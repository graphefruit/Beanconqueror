import { Component, ElementRef, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIImage } from '../../services/uiImage';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UIAlert } from '../../services/uiAlert';
import { UILog } from '../../services/uiLog';
import { TranslateService } from '@ngx-translate/core';
import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';

@Component({
  selector: 'ai-import-photo-gallery',
  templateUrl: './ai-import-photo-gallery.component.html',
  styleUrls: ['./ai-import-photo-gallery.component.scss'],
  standalone: false,
})
export class AiImportPhotoGalleryComponent {
  public static readonly COMPONENT_ID = 'ai-import-photo-gallery';

  public photoPaths: string[] = [];
  public attachPhotos: boolean = false;
  public readonly maxPhotos: number = 4;

  @ViewChild('photoSlides', { static: false })
  public photoSlides: ElementRef | undefined;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly uiImage: UIImage,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiAlert: UIAlert,
    private readonly uiLog: UILog,
    private readonly translate: TranslateService,
  ) {}

  /**
   * Add a photo via camera or library picker.
   * Uses Camera plugin directly to ensure HEIC images are converted to JPEG.
   */
  public async addPhoto(): Promise<void> {
    if (this.photoPaths.length >= this.maxPhotos) {
      return;
    }

    try {
      const option = await this.uiImage.showOptionChooser();

      if (option === 'TAKE' || option === 'CHOOSE') {
        // Use Camera plugin for both camera and library - it handles HEIC conversion
        const source =
          option === 'TAKE' ? CameraSource.Camera : CameraSource.Photos;
        try {
          const imageData = await Camera.getPhoto({
            correctOrientation: true,
            direction: CameraDirection.Rear,
            quality: 90,
            resultType: CameraResultType.Base64,
            saveToGallery: false,
            source: source,
          });

          if (imageData?.base64String) {
            this.uiLog.log(
              `AI Import Gallery: Camera returned base64, length: ${imageData.base64String.length}, format: ${imageData.format}`,
            );

            // Save to internal storage
            const fileName = await this.uiFileHelper.generateInternalPath(
              'photo',
              '.jpg',
            );
            const fileUri = await this.uiFileHelper.writeInternalFileFromBase64(
              imageData.base64String,
              fileName,
            );

            if (fileUri.path && this.photoPaths.length < this.maxPhotos) {
              this.photoPaths.push(fileUri.path);
              this.uiLog.log(
                `AI Import Gallery: Saved photo to ${fileUri.path}, total now: ${this.photoPaths.length}`,
              );
              this.updateSlider();
            }
          }
        } catch (e: any) {
          // User cancelled - check if it's actually an error
          if (e?.message && !e.message.includes('cancel')) {
            this.uiLog.error(`AI Import Gallery: Camera error: ${e}`);
          }
        }
      }
      // Note: CLIPBOARD option not included for AI import (less common use case)
    } catch (e) {
      // User cancelled option chooser - do nothing
    }
  }

  /**
   * Remove a photo at the given index
   */
  public async removePhoto(index: number): Promise<void> {
    const path = this.photoPaths[index];
    try {
      await this.uiFileHelper.deleteInternalFile(path);
    } catch (e) {
      // File may not exist, continue anyway
    }
    this.photoPaths.splice(index, 1);
    this.updateSlider();
  }

  /**
   * Start the analysis with collected photos
   */
  public startAnalysis(): void {
    this.uiLog.log(
      `AI Import Gallery: Starting analysis with ${this.photoPaths.length} photos: ${JSON.stringify(this.photoPaths)}`,
    );
    this.modalCtrl.dismiss(
      {
        photoPaths: this.photoPaths,
        attachPhotos: this.attachPhotos,
      },
      'confirm',
      AiImportPhotoGalleryComponent.COMPONENT_ID,
    );
  }

  /**
   * Cancel and clean up all photos
   */
  public async cancel(): Promise<void> {
    // Clean up all saved photos on cancel
    for (const path of this.photoPaths) {
      try {
        await this.uiFileHelper.deleteInternalFile(path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    this.modalCtrl.dismiss(
      null,
      'cancel',
      AiImportPhotoGalleryComponent.COMPONENT_ID,
    );
  }

  /**
   * Update the swiper after adding/removing photos
   */
  private updateSlider(): void {
    if (this.photoSlides) {
      setTimeout(() => {
        this.photoSlides.nativeElement.swiper?.update();
      }, 250);
    }
  }
}
