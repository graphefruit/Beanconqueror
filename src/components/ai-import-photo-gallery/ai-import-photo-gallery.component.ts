import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
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

  /** Screen reader announcement text for ARIA live region */
  public screenReaderAnnouncement: string = '';

  @ViewChild('photoSlides', { static: false })
  public photoSlides: ElementRef | undefined;

  @ViewChild('addPhotoButton', { static: false })
  private addPhotoButton: ElementRef | undefined;

  constructor(
    private readonly modalCtrl: ModalController,
    private readonly uiImage: UIImage,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiAlert: UIAlert,
    private readonly uiLog: UILog,
    private readonly translate: TranslateService,
  ) {}

  /**
   * Handle keyboard navigation for the gallery
   */
  @HostListener('document:keydown', ['$event'])
  public handleKeyboardNavigation(event: KeyboardEvent): void {
    // Gallery navigation when gallery is focused
    if (this.isGalleryFocused()) {
      switch (event.key) {
        case 'ArrowLeft':
          this.navigateToPreviousSlide();
          event.preventDefault();
          break;
        case 'ArrowRight':
          this.navigateToNextSlide();
          event.preventDefault();
          break;
        case 'Delete':
          this.removeCurrentPhoto();
          event.preventDefault();
          break;
      }
    }

    // Escape to close modal
    if (event.key === 'Escape') {
      this.cancel();
      event.preventDefault();
    }
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

            if (fileUri.path && this.photoPaths.length < this.maxPhotos) {
              this.photoPaths.push(fileUri.path);
              this.uiLog.log(
                `AI Import Gallery: Saved photo to ${fileUri.path}, total now: ${this.photoPaths.length}`,
              );
              this.updateSlider();

              // Focus management: move to new slide
              this.focusOnNewPhoto();

              // Announce to screen readers
              this.announcePhotoAdded();
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

    // Focus management after removal
    this.manageFocusAfterRemoval(wasLastPhoto, wasAtEnd, index);

    // Announce to screen readers
    this.announcePhotoRemoved();
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
   * Check if the gallery swiper is currently focused
   */
  private isGalleryFocused(): boolean {
    const activeElement = document.activeElement;
    return this.photoSlides?.nativeElement?.contains(activeElement) ?? false;
  }

  /**
   * Navigate to the previous slide in the gallery
   */
  private navigateToPreviousSlide(): void {
    if (this.photoSlides?.nativeElement?.swiper) {
      this.photoSlides.nativeElement.swiper.slidePrev();
    }
  }

  /**
   * Navigate to the next slide in the gallery
   */
  private navigateToNextSlide(): void {
    if (this.photoSlides?.nativeElement?.swiper) {
      this.photoSlides.nativeElement.swiper.slideNext();
    }
  }

  /**
   * Remove the currently displayed photo
   */
  private removeCurrentPhoto(): void {
    if (this.photoSlides?.nativeElement?.swiper && this.photoPaths.length > 0) {
      const activeIndex = this.photoSlides.nativeElement.swiper.activeIndex;
      this.removePhoto(activeIndex);
    }
  }

  /**
   * Focus on the newly added photo in the gallery
   */
  private focusOnNewPhoto(): void {
    setTimeout(() => {
      if (this.photoSlides?.nativeElement?.swiper) {
        // Navigate to the last slide (newly added)
        const lastIndex = this.photoPaths.length - 1;
        this.photoSlides.nativeElement.swiper.slideTo(lastIndex);

        // Focus the gallery container
        this.photoSlides.nativeElement.focus();
      }
    }, 300); // Allow swiper update to complete
  }

  /**
   * Manage focus after a photo is removed
   */
  private manageFocusAfterRemoval(
    wasLastPhoto: boolean,
    wasAtEnd: boolean,
    removedIndex: number,
  ): void {
    setTimeout(() => {
      if (wasLastPhoto) {
        // No photos left - focus on add button
        this.focusAddButton();
      } else if (this.photoSlides?.nativeElement?.swiper) {
        // Photos remain - focus on appropriate slide
        const newIndex = wasAtEnd ? removedIndex - 1 : removedIndex;
        const targetIndex = Math.max(
          0,
          Math.min(newIndex, this.photoPaths.length - 1),
        );
        this.photoSlides.nativeElement.swiper.slideTo(targetIndex);
        this.photoSlides.nativeElement.focus();
      }
    }, 300);
  }

  /**
   * Focus on the add photo button
   */
  private focusAddButton(): void {
    setTimeout(() => {
      if (this.addPhotoButton?.nativeElement) {
        this.addPhotoButton.nativeElement.focus();
      }
    }, 100);
  }

  /**
   * Announce to screen readers that a photo was added
   */
  private announcePhotoAdded(): void {
    this.screenReaderAnnouncement = this.translate.instant(
      'AI_IMPORT_PHOTO_ADDED',
      {
        current: this.photoPaths.length,
        max: this.maxPhotos,
      },
    );
    // Clear after announcement
    setTimeout(() => (this.screenReaderAnnouncement = ''), 1000);
  }

  /**
   * Announce to screen readers that a photo was removed
   */
  private announcePhotoRemoved(): void {
    if (this.photoPaths.length === 0) {
      this.screenReaderAnnouncement = this.translate.instant(
        'AI_IMPORT_ALL_PHOTOS_REMOVED',
      );
    } else {
      this.screenReaderAnnouncement = this.translate.instant(
        'AI_IMPORT_PHOTO_REMOVED',
        {
          remaining: this.photoPaths.length,
        },
      );
    }
    setTimeout(() => (this.screenReaderAnnouncement = ''), 1000);
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
