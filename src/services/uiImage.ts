import { inject, Service } from '@angular/core';

import { AlertController, ModalController, Platform } from '@ionic/angular';

import {
  Camera,
  CameraDirection,
  CameraPluginPermissions,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import {
  CameraPermissionType,
  PermissionStatus,
} from '@capacitor/camera/dist/esm/definitions';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { TranslateService } from '@ngx-translate/core';

import { Bean } from '../classes/bean/bean';
import { Brew } from '../classes/brew/brew';
import { GreenBean } from '../classes/green-bean/green-bean';
import { Mill } from '../classes/mill/mill';
import { Preparation } from '../classes/preparation/preparation';
import { RoastingMachine } from '../classes/roasting-machine/roasting-machine';
import { Settings } from '../classes/settings/settings';
import { Water } from '../classes/water/water';
import { PhotoPopoverComponent } from '../popover/photo-popover/photo-popover.component';
import { UIAlert } from './uiAlert';
import { UIFileHelper } from './uiFileHelper';
import { UIHelper } from './uiHelper';
import { UILog } from './uiLog';
import { UISettingsStorage } from './uiSettingsStorage';

@Service()
export class UIImage {
  private readonly alertController = inject(AlertController);
  private readonly platform = inject(Platform);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly translate = inject(TranslateService);
  private readonly uiAlert = inject(UIAlert);
  private readonly modalCtrl = inject(ModalController);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiLog = inject(UILog);

  /**
   * Photos the user took off a stored entry in its form, by entry. The
   * stored entry refers to their files until the form is saved, so they are
   * only deleted then (`deleteRemovedPhotos`), and never when it is cancelled.
   */
  private readonly removedPhotos = new WeakMap<object, string[]>();

  public removePhotoOnSave(_entry: object, _path: string): void {
    const paths = this.removedPhotos.get(_entry) ?? [];
    paths.push(_path);
    this.removedPhotos.set(_entry, paths);
  }

  /**
   * Deletes the files of the photos that were taken off `_entry` in its
   * form. Only to be called after the entry was stored without them.
   */
  public async deleteRemovedPhotos(_entry: {
    attachments: string[];
  }): Promise<void> {
    const paths = this.removedPhotos.get(_entry) ?? [];
    this.removedPhotos.delete(_entry);
    for (const path of paths) {
      // A form that reloads its entry shows the photo again.
      if (_entry.attachments.includes(path)) {
        continue;
      }
      try {
        await this.uiFileHelper.deleteInternalFile(path);
      } catch {
        // The entry is stored; a file that is left over does no harm.
      }
    }
  }

  private getImageQuality(): number {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    return settings.image_quality;
  }

  private async saveBase64Photo(base64: string): Promise<string> {
    const fileName = await this.uiFileHelper.generateInternalPath(
      'photo',
      '.jpg',
    );
    const fileUri = await this.uiFileHelper.writeInternalFileFromBase64(
      base64,
      fileName,
    );
    return fileUri.path;
  }

  public async takePhoto(): Promise<string> {
    const imageData = await Camera.getPhoto({
      correctOrientation: true,
      direction: CameraDirection.Rear,
      quality: this.getImageQuality(),
      resultType: CameraResultType.Base64, // starts with 'data:image/jpeg;base64,'
      saveToGallery: false,
      source: CameraSource.Camera,
    });

    const fileUri = await this.saveBase64Photo(imageData.base64String);
    return fileUri;
  }

  /**
   * Tells the user why a photo from `takePhoto` or `choosePhoto` was not
   * added. Closing the camera or the photo picker without a photo is no
   * error: the camera plugin rejects with "User cancelled photos app" then,
   * the file picker of `choosePhoto` with "pickFiles canceled.".
   */
  public reportPhotoNotAdded(_error: unknown): void {
    const message = (_error as { message?: unknown } | undefined)?.message;
    if (typeof message === 'string' && /cancel/i.test(message)) {
      this.uiLog.debug('Photo not added: camera or photo picker closed');
      return;
    }
    this.uiLog.warn('Photo could not be added', _error);
    // The camera plugin rejects with "User denied access to camera/photos".
    const denied = typeof message === 'string' && /denied/i.test(message);
    void this.uiAlert.showMessage(
      denied ? 'PHOTO_ACCESS_DENIED' : 'PHOTO_COULD_NOT_BE_ADDED',
      'ERROR_OCCURED',
      undefined,
      true,
    );
  }

  public async choosePhoto(): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      try {
        const fileurls: Array<string> = [];

        let result;
        if (this.platform.is('ios')) {
          // iOS keeps HEIC unless asked to transcode; photos are stored as .jpg.
          result = await FilePicker.pickImages({ skipTranscoding: false });
        } else {
          result = await FilePicker.pickFiles({
            types: ['image/png', 'image/jpeg', 'image/heic'],
          });
        }

        await this.uiAlert.showLoadingSpinner();

        for await (const file of result.files) {
          try {
            let imageBase64 = '';
            if (this.platform.is('android')) {
              /**Even so we set the type above, you could choose zip...**/
              if (file.mimeType.indexOf('image') >= 0) {
                imageBase64 = await this.uiFileHelper.readFileAsBase64(
                  file.path,
                );
              }
            } else {
              imageBase64 = await this.uiFileHelper.readFileAsBase64(file.path);
            }

            if (imageBase64 !== '') {
              try {
                const newUri = await this.saveBase64Photo(imageBase64);
                fileurls.push(newUri);
              } catch (ex) {}
            }
          } catch (ex) {
            setTimeout(() => {
              this.uiAlert.hideLoadingSpinner();
            }, 50);
            reject(ex);
          }
        }
        setTimeout(() => {
          this.uiAlert.hideLoadingSpinner();
        }, 50);
        // this.__cleanupCamera();

        if (fileurls.length > 0) {
          resolve(fileurls);
        } else {
          reject('We found no file urls');
        }
      } catch (ex) {
        this.uiAlert.hideLoadingSpinner();
        // Only the picker and the spinner throw here, both with an Error.
        reject(ex as Error);
      }
    });

    return promise;
  }

  public async showOptionChooser(): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      const alert = await this.alertController.create({
        header: this.translate.instant('CHOOSE'),
        subHeader: this.translate.instant('CHOOSE_PHOTO_OR_LIBRARY'),
        buttons: [
          {
            text: this.translate.instant('RECORD'),
            handler: () => {
              resolve('TAKE');
            },
          },
          {
            text: this.translate.instant('CHOOSE'),
            handler: () => {
              resolve('CHOOSE');
            },
          },
          {
            text: this.translate.instant('CLIPBOARD'),
            handler: () => {
              resolve('CLIPBOARD');
            },
          },
        ],
      });

      await alert.present();
    });

    return promise;
  }

  public async viewPhotos(
    _data:
      Bean | GreenBean | Brew | RoastingMachine | Water | Mill | Preparation,
  ) {
    const modal = await this.modalCtrl.create({
      component: PhotoPopoverComponent,
      id: PhotoPopoverComponent.COMPONENT_ID,
      componentProps: { data: _data },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async checkCameraPermission() {
    try {
      const permissionGiven: PermissionStatus = await Camera.checkPermissions();
      if (permissionGiven.camera == 'denied') {
        const requestPermission: PermissionStatus =
          await Camera.requestPermissions({ permissions: ['camera'] });
        if (requestPermission.camera == 'denied') {
          await this.uiAlert.showMessage(
            'NO_CAMERA_PERMISSION',
            null,
            null,
            true,
          );
          return false;
        } else {
          return true;
        }
      } else {
        return true;
      }
    } catch (ex) {
      return false;
    }
  }
}
