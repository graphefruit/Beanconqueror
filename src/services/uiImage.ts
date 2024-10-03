/** Core */
import { Injectable } from '@angular/core';
import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
} from '@capacitor/camera';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { ImagePicker } from '@awesome-cordova-plugins/image-picker/ngx';
/** Ionic */
import { AlertController, ModalController, Platform } from '@ionic/angular';
import { UIHelper } from './uiHelper';
import { UIFileHelper } from './uiFileHelper';
import { TranslateService } from '@ngx-translate/core';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';
import { FilePath } from '@awesome-cordova-plugins/file-path/ngx';
import { UIAlert } from './uiAlert';
import { PhotoPopoverComponent } from '../popover/photo-popover/photo-popover.component';
import { Brew } from '../classes/brew/brew';
import { GreenBean } from '../classes/green-bean/green-bean';
import { Bean } from '../classes/bean/bean';
import { RoastingMachine } from '../classes/roasting-machine/roasting-machine';
import { UISettingsStorage } from './uiSettingsStorage';
import { Settings } from '../classes/settings/settings';
import { Water } from '../classes/water/water';
import { Mill } from '../classes/mill/mill';
import { Preparation } from '../classes/preparation/preparation';
import { UILog } from './uiLog';

@Injectable({
  providedIn: 'root',
})
export class UIImage {
  constructor(
    private readonly imagePicker: ImagePicker,
    private readonly alertController: AlertController,
    private readonly platform: Platform,
    private readonly androidPermissions: AndroidPermissions,
    private readonly uiHelper: UIHelper,
    private readonly uiFileHelper: UIFileHelper,
    private readonly translate: TranslateService,
    private readonly filePath: FilePath,
    private readonly uiAlert: UIAlert,
    private readonly modalCtrl: ModalController,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiLog: UILog
  ) {}

  private getImageQuality(): number {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    return settings.image_quality;
  }

  private async saveBase64Photo(base64: string): Promise<string> {
    const fileName = await this.uiFileHelper.generateInternalPath(
      'beanconqueror_image',
      '.jpg'
    );
    const fileUri = await this.uiFileHelper.writeInternalFileFromBase64(
      base64,
      fileName
    );
    return fileUri;
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
      this.__checkPermission(
        async () => {
          setTimeout(async () => {
            const isCordova: boolean = this.platform.is('cordova');
            const isAndroid: boolean = this.platform.is('android');
            const fileurls: Array<string> = [];
            if (!(isCordova && isAndroid)) {
              if (isCordova) {
                // https://github.com/Telerik-Verified-Plugins/ImagePicker/issues/173#issuecomment-559096572
                this.imagePicker
                  .getPictures({
                    maximumImagesCount: 5,
                    outputType: 1,
                    disable_popover: true,
                    quality: this.getImageQuality(),
                  })
                  .then(
                    async (results) => {
                      await this.uiAlert.showLoadingSpinner();
                      for await (const result of results) {
                        if (result && result.path) {
                          try {
                            const newUri = await this.saveBase64Photo(
                              result.path
                            );
                            fileurls.push(newUri);
                          } catch (ex) {
                            //nothing
                          }
                        } else {
                          //Nothing
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
                    },
                    (err) => {
                      setTimeout(() => {
                        this.uiAlert.hideLoadingSpinner();
                      }, 50);
                      reject(err);
                    }
                  );
              }
            } else {
              // Android
              this.imagePicker
                .getPictures({
                  maximumImagesCount: 5,
                  outputType: 1,
                  disable_popover: true,
                  quality: this.getImageQuality(),
                })
                .then(
                  async (_files) => {
                    await this.uiAlert.showLoadingSpinner();

                    for await (const file of _files) {
                      let newFileName = file.path;
                      try {
                        // We cant copy the file if it doesn't start with file:///,
                        if (file.path.indexOf('file:') <= -1) {
                          if (file.path.indexOf('/') === 0) {
                            newFileName = 'file://' + file.path;
                          } else {
                            newFileName = 'file:///' + file.path;
                          }
                        }

                        let imageBase64 =
                          await this.uiFileHelper.readFileAsBase64(newFileName);

                        try {
                          const newUri = await this.saveBase64Photo(
                            imageBase64
                          );
                          fileurls.push(newUri);
                        } catch (ex) {}
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
                  },
                  (_err) => {
                    setTimeout(() => {
                      this.uiAlert.hideLoadingSpinner();
                    }, 50);
                    reject(_err);
                  }
                );
            }
          });
        },
        (_err) => {
          setTimeout(() => {
            this.uiAlert.hideLoadingSpinner();
          }, 50);
          reject(_err);
        }
      );
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
        ],
      });
      await alert.present();
    });

    return promise;
  }

  private __requestGaleryPermission(_success: any, _error: any): void {
    this.androidPermissions
      .requestPermissions([
        this.androidPermissions.PERMISSION.READ_MEDIA_IMAGES,
      ])
      .then(
        (_status) => {
          if (_status.hasPermission) {
            _success();
          } else {
            _error();
          }
        },
        () => {
          _error();
        }
      );
  }

  private __checkPermission(_success: any, _error: any): void {
    this.platform.ready().then(() => {
      _success();
      return;
      const isCordova: boolean = this.platform.is('cordova');
      const isAndroid: boolean = this.platform.is('android');
      if (isCordova && isAndroid) {
        this.androidPermissions
          .checkPermission(this.androidPermissions.PERMISSION.READ_MEDIA_IMAGES)
          .then(
            (_status) => {
              if (_status.hasPermission === false) {
                this.__requestGaleryPermission(_success, _error);
              } else {
                // We already have permission
                _success();
              }
            },
            () => {
              this.__requestGaleryPermission(_success, _error);
            }
          );
      } else {
        // No need to check for validations
        _success();
      }
    });

    /**
     * Check if we have permission to read images
     * @returns {Promise<boolean>} Returns a promise that resolves with a boolean that indicates whether we have permission
     */
    // hasReadPermission(): Promise<boolean>;
    /**
     * Request permission to read images
     * @returns {Promise<any>}
     */
    // requestReadPermission(): Promise<any>;
  }

  public async viewPhotos(
    _data:
      | Bean
      | GreenBean
      | Brew
      | RoastingMachine
      | Water
      | Mill
      | Preparation
  ) {
    const modal = await this.modalCtrl.create({
      component: PhotoPopoverComponent,
      id: PhotoPopoverComponent.COMPONENT_ID,
      componentProps: { data: _data },
    });
    await modal.present();
    await modal.onWillDismiss();
  }
}
