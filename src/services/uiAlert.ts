/** Core */
import { Injectable } from '@angular/core';
/** Ionic */
import { AlertController } from 'ionic-angular';

@Injectable()
export class UIAlert {

  constructor(private alertController: AlertController) {
  }

  /**
   * @method showMessage
   */
  public showMessage(_message: string, _title?: string, _ok?: string) {
    if (!_ok) {
      _ok = 'OK';
    }
    let promise = new Promise((resolve, reject) => {
      const alert = this.alertController.create({
        title: _title,
        subTitle: _message,
        buttons: [
          {
            text: _ok,
            handler: () => {
              resolve();
            }
          }
        ]
      });
      alert.present({animate: false});
    });
    return promise;
  }

  public showConfirm(_message: string, _title?: string) {

    let promise = new Promise((resolve, reject) => {
      const alert = this.alertController.create({
        title: _title,
        subTitle: _message,
        buttons: [
          {
            text: 'Nein',
            role: 'cancel',
            handler: () => {
              reject();
            }
          },
          {
            text: 'Ja',
            handler: () => {
              resolve();
            }
          }
        ]
      });
      alert.present({animate: false});
    });
    return promise;
  }

}
