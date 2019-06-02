/** Core */
import { Injectable } from '@angular/core';
import { AndroidPermissions } from '@ionic-native/android-permissions';
/** Ionic native  */
import { Camera, CameraOptions } from '@ionic-native/camera';
import { ImagePicker } from '@ionic-native/image-picker';
/** Ionic */
import { AlertController, Platform } from 'ionic-angular';

@Injectable()
export class UIImage {
  constructor(private camera: Camera,
              private imagePicker: ImagePicker,
              private alertController: AlertController,
              private platform: Platform,
              private androidPermissions: AndroidPermissions) {
  }

  public takePhoto(): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      const options: CameraOptions = {
        quality: 100,
        destinationType: this.camera.DestinationType.FILE_URI,
        encodingType: this.camera.EncodingType.JPEG,
        mediaType: this.camera.MediaType.PICTURE,
        sourceType: this.camera.PictureSourceType.CAMERA,
        saveToPhotoAlbum: true,
        correctOrientation: true
      };
      this.camera.getPicture(options)
        .then(
          (imageData) => {
            let imageStr: string = imageData;
            const isIos: boolean = this.platform.is('ios');
            if (isIos) {
              imageStr = imageStr.replace(/^file:\/\//, '');
            }
            resolve(imageStr);
          },
          (err) => {
            reject();
          }
        );
    });
    return promise;
  }

  public choosePhoto(): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      this.__checkPermission(() => {
          setTimeout(() => {
            this.imagePicker.getPictures({maximumImagesCount: 1}).then((results) => {
              if (results && results.length > 0 && results[0] !== 0 && results[0] !== '' && results[0] !== 'OK' && results[0].length > 5) {
                const imagePath = results[0];
                resolve(imagePath);
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

  public showOptionChooser(): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      const alert = this.alertController.create({
        title: 'Auswählen',
        subTitle: 'Foto aufnehmen oder aus Bibliothek auswählen',
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
      alert.present({animate: false});
    });
    return promise;
  }

  private __requestGaleryPermission(_success: any, _error: any): void {
    this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE).then((_status) => {
      if (_status.hasPermission === true) {
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
