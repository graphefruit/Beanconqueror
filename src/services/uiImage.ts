/**Core**/
import {Injectable} from '@angular/core';
/**Ionic**/
import {AlertController, Platform} from 'ionic-angular';
/**Ionic native **/
import {MediaCapture, MediaFile, CaptureError, CaptureImageOptions} from '@ionic-native/media-capture';
import {ImagePicker} from '@ionic-native/image-picker';

/**Third party**/
declare var console;
@Injectable()
export class UIImage {
  constructor(private mediaCapture: MediaCapture, private imagePicker: ImagePicker, private alertController: AlertController, private platform: Platform) {
  }


  private __requestGaleryPermission(_success: any, _error: any) {
    this.imagePicker.requestReadPermission().then(() => {

      _success();
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
          this.imagePicker.hasReadPermission().then((_permission) => {
            if (_permission === false) {
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
      let options: CaptureImageOptions = {limit: 1};
      this.mediaCapture.captureImage(options)
        .then(
          (data: MediaFile[]) => {
            resolve(data[0].fullPath);
          },
          (err: CaptureError) => {
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
