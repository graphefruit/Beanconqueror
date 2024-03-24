/** Core */
import { Injectable } from '@angular/core';
/** Ionic */
import { ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class UIToast {
  constructor(
    private readonly translate: TranslateService,
    private readonly toastController: ToastController
  ) {}

  public async showInfoToast(_message: string, translate: boolean = true) {
    let message = _message;
    if (translate === true) {
      message = this.translate.instant(_message);
    }
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      position: 'top',
      animated: false,
      buttons: [
        {
          side: 'end',
          text: 'X',
          role: 'cancel',
          handler: () => {},
        },
      ],
    });
    toast.present();
  }

  public async showInfoToastBottom(_message: string) {
    const toast = await this.toastController.create({
      message: this.translate.instant(_message),
      duration: 2000,
      position: 'bottom',
      animated: false,
      buttons: [
        {
          side: 'end',
          text: 'X',
          role: 'cancel',
          handler: () => {},
        },
      ],
    });
    toast.present();
  }
}
