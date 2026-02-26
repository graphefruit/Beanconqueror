import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonTitle,
  IonToggle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  addOutline,
  close,
  closeOutline,
  imagesOutline,
  trash,
  trashOutline,
} from 'ionicons/icons';

import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import { TranslatePipe } from '@ngx-translate/core';

import { UIAlert } from '../../services/uiAlert';
import { UIFileHelper } from '../../services/uiFileHelper';
import { UIImage } from '../../services/uiImage';
import { UILog } from '../../services/uiLog';
import { AsyncImageComponent } from '../async-image/async-image.component';

@Component({
  selector: 'ai-import-photo-gallery',
  templateUrl: './ai-import-photo-gallery.component.html',
  styleUrls: ['./ai-import-photo-gallery.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    FormsModule,
    TranslatePipe,
    AsyncImageComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonItem,
    IonLabel,
    IonToggle,
  ],
})
export class AiImportPhotoGalleryComponent {
  public static readonly COMPONENT_ID = 'ai-import-photo-gallery';

  private readonly modalCtrl = inject(ModalController);
  private readonly uiImage = inject(UIImage);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiLog = inject(UILog);

  public photoPaths: string[] = [];
  public attachPhotos = false;
  public readonly maxPhotos: number = 4;

  @ViewChild('photoSlides', { static: false })
  public photoSlides: ElementRef | undefined;

  constructor() {
    addIcons({
      add,
      addOutline,
      close,
      closeOutline,
      imagesOutline,
      trash,
      trashOutline,
    });
  }

  /**
   * Add a photo via camera or library picker.
   * Uses Camera plugin directly to ensure HEIC images are converted to JPEG.
   *
   * Error handling: User cancellations are expected behavior and silently ignored.
   * Actual errors (permission issues, storage failures) are logged for debugging.
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

            if (fileUri.path) {
              this.photoPaths.push(fileUri.path);
              this.uiLog.log(
                `AI Import Gallery: Saved photo to ${fileUri.path}, total now: ${this.photoPaths.length}`,
              );
              this.updateSlider();

              // Slide to the newly added photo
              this.focusOnNewPhoto();
            }
          }
        } catch (e: any) {
          // User cancellation is expected behavior, log actual errors
          const isCancellation = this.isCancellationError(e);
          if (!isCancellation) {
            this.uiLog.error(
              `AI Import Gallery: Camera error: ${e?.message || e}`,
            );
          }
        }
      }
      // Note: CLIPBOARD option not included for AI import (less common use case)
    } catch (e: any) {
      // Option chooser dismissal - only log unexpected errors
      const isDismissal = this.isOptionChooserDismissal(e);
      if (!isDismissal) {
        this.uiLog.error(
          `AI Import Gallery: Option chooser error: ${e?.message || e}`,
        );
      }
    }
  }

  /**
   * Check if an error represents a user cancellation (camera/photo picker).
   */
  private isCancellationError(e: any): boolean {
    if (!e) return true; // No error is effectively a cancellation
    const message = e?.message?.toLowerCase() || '';
    const code = e?.code || '';
    return (
      message.includes('cancel') ||
      message.includes('user denied') ||
      message.includes('permission denied') ||
      code === 'USER_CANCELLED' ||
      code === 'PERMISSION_DENIED'
    );
  }

  /**
   * Check if an error represents option chooser dismissal.
   */
  private isOptionChooserDismissal(e: any): boolean {
    if (!e) return true; // No error is effectively a dismissal
    const message = e?.message?.toLowerCase() || '';
    return (
      message.includes('dismiss') ||
      message.includes('cancel') ||
      message.includes('backdrop')
    );
  }

  /**
   * Remove a photo at the given index
   */
  public async removePhoto(index: number): Promise<void> {
    if (index < 0 || index >= this.photoPaths.length) {
      return;
    }
    const path = this.photoPaths[index];
    const wasLastPhoto = this.photoPaths.length === 1;
    const wasAtEnd = index === this.photoPaths.length - 1;

    try {
      await this.uiFileHelper.deleteInternalFile(path);
    } catch (e) {
      // File may not exist, continue anyway
    }

    this.photoPaths.splice(index, 1);
    this.updateSlider();

    // Slide to appropriate photo after removal
    this.manageFocusAfterRemoval(wasLastPhoto, wasAtEnd, index);
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
   * Slide to the newly added photo in the gallery
   */
  private focusOnNewPhoto(): void {
    setTimeout(() => {
      if (this.photoSlides?.nativeElement?.swiper) {
        const lastIndex = this.photoPaths.length - 1;
        this.photoSlides.nativeElement.swiper.slideTo(lastIndex);
      }
    }, 300); // Allow swiper update to complete
  }

  /**
   * Slide to the appropriate photo after a removal
   */
  private manageFocusAfterRemoval(
    wasLastPhoto: boolean,
    wasAtEnd: boolean,
    removedIndex: number,
  ): void {
    if (wasLastPhoto) {
      return;
    }
    setTimeout(() => {
      if (this.photoSlides?.nativeElement?.swiper) {
        const newIndex = wasAtEnd ? removedIndex - 1 : removedIndex;
        const targetIndex = Math.max(
          0,
          Math.min(newIndex, this.photoPaths.length - 1),
        );
        this.photoSlides.nativeElement.swiper.slideTo(targetIndex);
      }
    }, 300);
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
