/** Core */
import { Injectable } from '@angular/core';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
/** Ionic native  */
import { Camera, CameraOptions } from '@awesome-cordova-plugins/camera/ngx';
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
    private readonly camera: Camera,
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

  private getImageQuality() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    return settings.image_quality;
  }

  public async takePhoto(): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      // const isIos: boolean = this.platform.is('ios');
      const options: CameraOptions = {
        quality: this.getImageQuality(),
        destinationType: this.camera.DestinationType.DATA_URL,
        encodingType: this.camera.EncodingType.JPEG,
        mediaType: this.camera.MediaType.PICTURE,
        sourceType: this.camera.PictureSourceType.CAMERA,
        saveToPhotoAlbum: false,
        correctOrientation: true,
        cameraDirection: this.camera.Direction.BACK,
      };

      this.camera.getPicture(options).then(
        (imageData) => {
          const imageStr: string = `data:image/jpeg;base64,${imageData}`;
          this.uiFileHelper
            .saveBase64File('beanconqueror_image', '.jpg', imageStr)
            .then(
              (_newURL) => {
                // const filePath = _newURL.replace(/^file:\/\//, '');
                resolve(_newURL);
                // this.__cleanupCamera();
              },
              (_error) => {
                reject(_error);
              }
            );
        },
        (_error: any) => {
          reject(_error);
        }
      );
    });

    return promise;
  }

  private __cleanupCamera() {
    try {
      const isCordova: boolean = this.platform.is('cordova');
      const isIOS: boolean = this.platform.is('ios');
      if (isCordova && isIOS) {
        this.uiLog.log('Cleanup camera');
        this.camera.cleanup().then(
          () => {
            this.uiLog.log('Cleanup camera - sucessfully');
          },
          () => {
            this.uiLog.error('Cleanup camera - error');
          }
        );
      }
    } catch (ex) {}
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
                        if (
                          result &&
                          result.length > 0 &&
                          result !== 0 &&
                          result !== '' &&
                          result !== 'OK' &&
                          result.length > 5
                        ) {
                          try {
                            const imageStr: string = `data:image/jpeg;base64,${result}`;
                            const newURL =
                              await this.uiFileHelper.saveBase64File(
                                'beanconqueror_image',
                                '.jpg',
                                imageStr
                              );
                            fileurls.push(newURL);
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

                        const result =
                          await this.uiFileHelper.getBase64FileFromExternalAndroid(
                            newFileName
                          );
                        let imageStr: string = '';
                        if (result.indexOf('data:image') >= 0) {
                          // All good
                          imageStr = result;
                        } else {
                          imageStr = `data:image/jpeg;base64,${result}`;
                        }

                        try {
                          const newUrl = await this.uiFileHelper.saveBase64File(
                            'beanconqueror_image',
                            '.jpg',
                            imageStr
                          );
                          fileurls.push(newUrl);
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
