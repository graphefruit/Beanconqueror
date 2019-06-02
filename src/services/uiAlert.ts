/** Core */
import {Injectable} from '@angular/core';
/** Ionic */
import {AlertController} from 'ionic-angular';

@Injectable()
export class UIAlert {

  constructor(private alertController: AlertController) {
  }


  /**
   * @method showMessage
   */
  public showMessage(_message: string, _title?: string,_ok?:string) {
    if (!_ok){
      _ok ="OK";
    }
    var promise = new Promise((resolve, reject) => {
      let alert = this.alertController.create({
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
      alert.present({animate:false});
    });
    return promise;
  }



   public showConfirm(_message: string, _title?: string) {

    var promise = new Promise((resolve, reject) => {
      let alert = this.alertController.create({
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
      alert.present({animate:false});
    });
    return promise;
  }



}
