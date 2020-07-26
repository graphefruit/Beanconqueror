/** Core */
import {Injectable} from '@angular/core';
import {AndroidPermissions} from '@ionic-native/android-permissions/ngx';
/** Ionic native  */
import {Camera, CameraOptions} from '@ionic-native/camera/ngx';
import {ImagePicker} from '@ionic-native/image-picker/ngx';
/** Ionic */
import {AlertController, Platform} from '@ionic/angular';
import {UIHelper} from './uiHelper';
import {UIFileHelper} from './uiFileHelper';
import {TranslateService} from '@ngx-translate/core';
import {FileChooser} from '@ionic-native/file-chooser/ngx';
import {FilePath} from '@ionic-native/file-path/ngx';


@Injectable({
  providedIn: 'root'
})
export class UIImage {
  constructor (private readonly camera: Camera,
               private readonly imagePicker: ImagePicker,
               private readonly alertController: AlertController,
               private readonly platform: Platform,
               private readonly androidPermissions: AndroidPermissions,
               private readonly uiHelper: UIHelper,
               private readonly uiFileHelper: UIFileHelper,
               private readonly translate: TranslateService,
               private readonly fileChooser: FileChooser,
               private readonly filePath: FilePath) {
  }

  public async takePhoto (): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      // const isIos: boolean = this.platform.is('ios');
      const options: CameraOptions = {
        quality: 100,
        destinationType: this.camera.DestinationType.DATA_URL,
        encodingType: this.camera.EncodingType.JPEG,
        mediaType: this.camera.MediaType.PICTURE,
        sourceType: this.camera.PictureSourceType.CAMERA,
        saveToPhotoAlbum: false,
        correctOrientation: true
      };

      this.camera.getPicture(options).then(
          (imageData) => {
            const imageStr: string = `data:image/jpeg;base64,${imageData}`;
            this.uiFileHelper.saveBase64File('beanconqueror_image', '.png', imageStr).then((_newURL) => {
              // const filePath = _newURL.replace(/^file:\/\//, '');
              resolve(_newURL);
            });
          },
          (_err: any) => {
            reject();
          }
        );
    });

    return promise;
  }

  public async choosePhoto (): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      this.__checkPermission(async () => {

          setTimeout(async () => {

            const isCordova: boolean = this.platform.is('cordova');
            const isAndroid: boolean = this.platform.is('android');
            if (isCordova && isAndroid) {
              this.fileChooser.open().then((uri) => {
                this.filePath.resolveNativePath(uri).then((path) => {
                  if (path && (path.toLowerCase().endsWith('.png') || path.toLowerCase().endsWith('.jpg') ||
                    path.toLowerCase().endsWith('.jpeg') || path.toLowerCase().endsWith('.gif'))) {
                    this.uiFileHelper.copyFileWithSpecificName(path).then((_fullPath) => {
                      resolve(_fullPath);
                    }, () => {
                      reject();
                    });
                  } else {
                    reject();
                  }
                }, () => {
                  reject();
                });
              }, () => {
                reject();
              });
            } else if (isCordova) {
              this.imagePicker.getPictures({maximumImagesCount: 1, outputType: 1}).then((results) => {
                if (results && results.length > 0 && results[0] !== 0 && results[0] !== ''
                  && results[0] !== 'OK' && results[0].length > 5) {
                  const imageStr: string = `data:image/jpeg;base64,${results[0]}`;
                  this.uiFileHelper.saveBase64File('beanconqueror_image', '.png', imageStr).then((_newURL) => {
                    resolve(_newURL);
                  });
                } else {
                  reject();
                }
              }, (err) => {
                reject();
              });
            }
          });

        }, () => {
          reject();
        }
      );
    });

    return promise;
  }

  public async showOptionChooser (): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      const alert = await this.alertController.create({
        header: this.translate.instant('CHOOSE'),
        subHeader: this.translate.instant('CHOOSE_PHOTO_OR_LIBRARY'),
        buttons: [
          {
            text: this.translate.instant('RECORD'),
            handler: () => {
              resolve('TAKE');
            }
          },
          {
            text: this.translate.instant('CHOOSE'),
             handler: () => {
               resolve('CHOOSE');
             }
          }
        ]
      });
      await alert.present();
    });

    return promise;
  }

  private __requestGaleryPermission(_success: any, _error: any): void {
    this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE).then((_status) => {
      if (_status.hasPermission) {
        _success();
      } else {
        _error();
      }
    }, () => {
      _error();
    });
  }

  private __checkPermission(_success: any, _error: any): void {
    this.platform.ready().then(
      () => {

        const isCordova: boolean = this.platform.is('cordova');
        const isAndroid: boolean = this.platform.is('android');
        if (isCordova && isAndroid) {
          this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE).then((_status) => {
            if (_status.hasPermission === false) {
              this.__requestGaleryPermission(_success, _error);
            } else {
              // We already have permission
              _success();
            }
          }, () => {
            this.__requestGaleryPermission(_success, _error);
          });
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



}
