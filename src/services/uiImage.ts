/** Core */
import {Injectable} from '@angular/core';
import {AndroidPermissions} from '@ionic-native/android-permissions/ngx';
/** Ionic native  */
import {Camera, CameraOptions} from '@ionic-native/camera/ngx';
import {ImagePicker} from '@ionic-native/image-picker/ngx';
/** Ionic */
import {AlertController, Platform} from '@ionic/angular';
import {UIHelper} from './uiHelper';
import {any} from 'codelyzer/util/function';
import {UIFileHelper} from './uiFileHelper';

@Injectable()
export class UIImage {
  constructor (private readonly camera: Camera,
               private readonly imagePicker: ImagePicker,
               private readonly alertController: AlertController,
               private readonly platform: Platform,
               private readonly androidPermissions: AndroidPermissions,
               private readonly uiHelper: UIHelper,
               private readonly uiFileHelper: UIFileHelper) {
  }

  public async takePhoto (): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      const isIos: boolean = this.platform.is('ios');
      let options: CameraOptions = {};
      if (isIos) {
        options = {
          quality: 100,
          destinationType: this.camera.DestinationType.DATA_URL,
          encodingType: this.camera.EncodingType.JPEG,
          mediaType: this.camera.MediaType.PICTURE,
          sourceType: this.camera.PictureSourceType.CAMERA,
          saveToPhotoAlbum: false,
          correctOrientation: true
        };
      } else {
        options = {
          quality: 100,
          destinationType: this.camera.DestinationType.DATA_URL,
          encodingType: this.camera.EncodingType.JPEG,
          mediaType: this.camera.MediaType.PICTURE,
          sourceType: this.camera.PictureSourceType.CAMERA,
          saveToPhotoAlbum: false,
          correctOrientation: true
        };
      }

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
    const promise = new Promise((resolve, reject) => {
      this.__checkPermission(() => {
          setTimeout(() => {
            this.imagePicker.getPictures({maximumImagesCount: 1, outputType: 1}).then((results) => {
              if (results && results.length > 0 && results[0] !== 0 && results[0] !== '' && results[0] !== 'OK' && results[0].length > 5) {
                const imageStr: string = `data:image/jpeg;base64,${results[0]}`;
                this.uiFileHelper.saveBase64File('beanconqueror_image', '.png', imageStr).then((_newURL) => {
                  // const filePath = _newURL.replace(/^file:\/\//, '');
                  resolve(_newURL);
                });
                // const imagePath = results[0];
                // console.log(`Choose Photo Path ${imagePath}`);
                // resolve(imagePath);
              } else {
                reject();
              }

            }, (err) => {
              reject();
            });
          });
        }
        , () => {
          reject();
        }
      );
    });

    return promise;
  }

  public async showOptionChooser (): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      const alert = await this.alertController.create({
        header: 'Auswählen',
        subHeader: 'Foto aufnehmen oder aus Bibliothek auswählen',
        buttons: [
          {
            text: 'Aufnehmen',
            handler: () => {
              resolve('TAKE');
            }
          },
          {
             text: 'Auswählen',
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
