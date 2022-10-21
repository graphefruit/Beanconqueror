/** Core */
import { Injectable } from '@angular/core';
/** Ionic */
import {
  AlertController,
  LoadingController,
  ModalController,
} from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { CustomPopoverComponent } from '../popover/custom-popover/custom-popover.component';
import { FilesystemErrorPopoverComponent } from '../popover/filesystem-error-popover/filesystem-error-popover.component';

@Injectable({
  providedIn: 'root',
})
export class UIAlert {
  constructor(
    private readonly alertController: AlertController,
    private readonly translate: TranslateService,
    private readonly modalController: ModalController,
    private readonly loadingController: LoadingController
  ) {}

  private loadingSpinner;

  public async showLoadingSpinner() {
    if (this.loadingSpinner) {
      await this.hideLoadingSpinner();
    }
    this.loadingSpinner = await this.loadingController.create({
      message: this.translate.instant('PLEASE_WAIT'),
    });
    this.loadingSpinner.present();
  }

  public setLoadingSpinnerMessage(message: string, translate: boolean = false) {
    if (this.loadingSpinner) {
      if (translate === false) {
        this.loadingSpinner.message = message;
      } else {
        this.loadingSpinner.message = this.translate.instant(message);
      }
    }
  }

  public async hideLoadingSpinner() {
    if (this.loadingSpinner) {
      await this.loadingSpinner.dismiss();
      this.loadingSpinner = undefined;
    }
  }

  /**
   * @method showMessage
   */
  public async showAppShetItSelfMessage() {
    const modal = await this.modalController.create({
      component: FilesystemErrorPopoverComponent,
      cssClass: 'half-bottom-modal',
      showBackdrop: true,
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  /**
   * @method showMessage
   */
  public async showMessage(
    _message: string,
    _title?: string,
    _ok?: string,
    _translate?: boolean
  ): Promise<any> {
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
        message: _message,
        backdropDismiss: false,
        buttons: [
          {
            text: okText,
            handler: () => {
              resolve(undefined);
            },
          },
        ],
      });
      await alert.present();
    });

    return promise;
  }
  public async showConfirm(
    _message: string,
    _title?: string,
    _translate?: boolean
  ): Promise<any> {
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
            },
          },
          {
            text: this.translate.instant('YES'),
            handler: () => {
              resolve(undefined);
            },
          },
        ],
      });
      await alert.present();
    });
  }

  public async presentCustomPopover(
    _title: string,
    _description: string,
    _okText: string
  ) {
    await this.showMessage(_description, _title, _okText, true);
  }
}
