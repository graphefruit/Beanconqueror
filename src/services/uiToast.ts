/** Core */
import { Injectable, inject } from '@angular/core';
/** Ionic */
import { ToastController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class UIToast {
  private readonly translate = inject(TranslateService);
  private readonly toastController = inject(ToastController);

  public async showAutomaticSaveTimer(_seconds: number) {
    let message = this.translate.instant('SAVING_BREW_COUNTDOWN', {
      time: _seconds.toString(),
    });

    const toast = await this.toastController.create({
      message: message,
      duration: _seconds * 1000,
      position: 'top',
      animated: false,
      cssClass: 'toast-automatic-save-timer',
      buttons: [
        {
          text: this.translate.instant('CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('SAVE_NOW'),
          role: 'save',
        },
      ],
    });
    await toast.present();
    let delayCounter = _seconds;

    let delayIntv = setInterval(() => {
      delayCounter = delayCounter - 1;
      if (delayCounter <= 0) {
        toast.message = this.translate.instant('SAVING_BREW_COUNTDOWN', {
          time: delayCounter.toString(),
        });
        clearInterval(delayIntv);
        delayIntv = undefined;
      } else {
        toast.message = this.translate.instant('SAVING_BREW_COUNTDOWN', {
          time: delayCounter.toString(),
        });
      }
    }, 1000);

    const responseToast = await toast.onDidDismiss();
    if (delayIntv) {
      clearInterval(delayIntv);
    }
    return responseToast.role;
  }
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
