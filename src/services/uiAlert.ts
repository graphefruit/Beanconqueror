/** Core */
import {Injectable} from '@angular/core';
/** Ionic */
import {AlertController} from '@ionic/angular';
import {TranslateService} from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class UIAlert {

  constructor(private readonly alertController: AlertController,
              private readonly translate: TranslateService) {
  }

  /**
   * @method showMessage
   */
  public async showMessage(_message: string, _title?: string, _ok?: string, _translate?: boolean): Promise<any> {
    if (_translate === true) {
      _message = this.translate.instant(_message);

      if (_title) {
        _title = this.translate.instant(_title);
      }
      if (_ok) {
        _ok = this.translate.instant(_ok);
      }
    }
    let okText: string = 'OK';
    if (_ok) {
      okText = _ok;
    }
    const promise = new Promise(async (resolve, reject) => {
      const alert = await this.alertController.create({
        header: _title,
        subHeader: _message,
        backdropDismiss: false,
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
  public async showConfirm(_message: string, _title?: string, _translate?: boolean): Promise<any> {
    if (_translate === true) {
      _message = this.translate.instant(_message);

      if (_title) {
        _title = this.translate.instant(_title);
      }
    }

    return new Promise(async (resolve, reject) => {
      const alert = await this.alertController.create({
        header: _title,
        subHeader: _message,
        backdropDismiss: false,
        buttons: [
          {
            text: this.translate.instant('NO'),
            role: 'cancel',
            handler: () => {
              reject();
            }
          },
          {
            text: this.translate.instant('YES'),
            handler: () => {
              resolve();
            }
          }
        ]
      });
      await alert.present();
    });
  }

}
