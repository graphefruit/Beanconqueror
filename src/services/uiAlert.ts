/** Core */
import {Injectable} from '@angular/core';
/** Ionic */
import {AlertController} from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class UIAlert {

  constructor (private readonly alertController: AlertController) {
  }

  /**
   * @method showMessage
   */
  public async showMessage (_message: string, _title?: string, _ok?: string): Promise<any> {
    let okText: string = 'OK';
    if (_ok) {
      okText = _ok;
    }
    const promise = new Promise(async (resolve, reject) => {
      const alert = await this.alertController.create({
        header: _title,
        subHeader: _message,
        buttons: [
          {
            text: okText,
            handler: () => {
              resolve();
            }
          }
        ]
      });
      await alert.present();
    });

    return promise;
  }

  public async showConfirm (_message: string, _title?: string): Promise<any> {

    const promise = new Promise(async (resolve, reject) => {
      const alert = await this.alertController.create({
        header: _title,
        subHeader: _message,
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
      await alert.present();
    });

    return promise;
  }

}
