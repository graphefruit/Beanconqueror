/** Core */
import {Injectable} from '@angular/core';
/** Ionic */
import {AlertController, Platform} from 'ionic-angular';
/** Ionic native  */
import {Camera,CameraOptions} from '@ionic-native/camera';
import {ImagePicker} from '@ionic-native/image-picker';
import {AndroidPermissions} from '@ionic-native/android-permissions';


@Injectable()
export class UIImage {
  constructor(private camera: Camera, private imagePicker: ImagePicker, private alertController: AlertController, private platform: Platform, private androidPermissions: AndroidPermissions) {
  }


  private __requestGaleryPermission(_success: any, _error: any) {
    this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE).then((_status) => {
      if (_status.hasPermission === true) {
        _success();
      }
      else {
        _error();
      }
    }, () => {
      _error();
    });
  }

  private __checkPermission(_success: any, _error: any) {
    this.platform.ready().then(
      () => {

        let isCordova: boolean = this.platform.is('cordova');
        let isAndroid: boolean = this.platform.is('android');
        if (isCordova && isAndroid) {
          this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE).then((_status) => {
            if (_status.hasPermission === false) {
              this.__requestGaleryPermission(_success, _error)
            }
            else {
              //We already have permission
              _success();
            }
          }, () => {
            this.__requestGaleryPermission(_success, _error)
          })
        }
        else {
          //No need to check for validations
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
    /// requestReadPermission(): Promise<any>;
  }

  public takePhoto() {
    var promise = new Promise((resolve, reject) => {
      const options: CameraOptions = {
        quality: 100,
        destinationType: this.camera.DestinationType.FILE_URI,
        encodingType: this.camera.EncodingType.JPEG,
        mediaType: this.camera.MediaType.PICTURE,
        sourceType: this.camera.PictureSourceType.CAMERA,
        saveToPhotoAlbum: true,
        correctOrientation:true,
      };
      this.camera.getPicture(options)
        .then(
          (imageData) => {
            let isIos: boolean = this.platform.is('ios');
            if (isIos) {
              imageData = imageData.replace(/^file:\/\//, '');
            }
            resolve(imageData);
          },
          (err) => {
            reject();
          }
        );
    });
    return promise;
  }

  /**
   *
   * @returns {Promise<T>}
   */
  public choosePhoto() {
    var promise = new Promise((resolve, reject) => {
      this.__checkPermission(() => {
          setTimeout(() => {
            this.imagePicker.getPictures({maximumImagesCount: 1}).then((results) => {
              if (results && results.length > 0 && results[0] != 0 && results[0] != "" && results[0] != "OK" && results[0].length > 5) {
                var imagePath = results[0];
                resolve(imagePath);
              }
              else {
                reject();
              }

            }, (err) => {
              reject();
            });
          })
        }
        , () => {
          reject();
        }
      )
    });
    return promise;
  }


  public showOptionChooser() {
    var promise = new Promise((resolve, reject) => {
      let alert = this.alertController.create({
        title: "Auswählen",
        subTitle: "Foto aufnehmen oder aus Bibliothek auswählen",
        buttons: [
          {
            text: 'Aufnehmen',
            handler: () => {
              resolve("TAKE");
            }
          },
          {
            text: 'Auswählen',
            handler: () => {
              resolve("CHOOSE");
            }
          }
        ]
      });
      alert.present({animate: false});
    });
    return promise;
  }


}
