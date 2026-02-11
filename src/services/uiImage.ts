import { inject, Injectable } from '@angular/core';

import {
  AlertController,
  ModalController,
  Platform,
} from '@ionic/angular/standalone';

import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
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
import { UISettingsStorage } from './uiSettingsStorage';

@Injectable({
  providedIn: 'root',
})
export class UIImage {
  private readonly alertController = inject(AlertController);
  private readonly platform = inject(Platform);
  private readonly androidPermissions = inject(AndroidPermissions);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly translate = inject(TranslateService);
  private readonly uiAlert = inject(UIAlert);
  private readonly modalCtrl = inject(ModalController);
  private readonly uiSettingsStorage = inject(UISettingsStorage);

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

  public async choosePhoto(): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      try {
        const fileurls: Array<string> = [];

        let result;
        if (this.platform.is('ios')) {
          result = await FilePicker.pickImages();
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
      | Bean
      | GreenBean
      | Brew
      | RoastingMachine
      | Water
      | Mill
      | Preparation,
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
