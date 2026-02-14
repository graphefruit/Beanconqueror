import { inject, Injectable } from '@angular/core';

import { AlertController, ModalController } from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';

import { LogTextComponent } from '../app/info/log/log-text/log-text.component';
import { AppEvent } from '../classes/appEvent/appEvent';
import { sleep } from '../classes/devices';
import { AppEventType } from '../enums/appEvent/appEvent';
import { FilesystemErrorPopoverComponent } from '../popover/filesystem-error-popover/filesystem-error-popover.component';
import { LoadingPopoverComponent } from '../popover/loading-popover/loading-popover.component';
import { EventQueueService } from './queueService/queue-service.service';

@Injectable({
  providedIn: 'root',
})
export class UIAlert {
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);
  private readonly modalController = inject(ModalController);
  private eventQueue = inject(EventQueueService);

  private static instance: UIAlert;
  public static getInstance(): UIAlert {
    if (UIAlert.instance) {
      return UIAlert.instance;
    }

    return undefined;
  }

  constructor() {
    if (UIAlert.instance === undefined) {
      UIAlert.instance = this;
    }
  }

  private existingLoadingSpinners: HTMLIonModalElement[] = [];

  public async showLoadingSpinner(
    message = 'PLEASE_WAIT',
    translate = true,
  ): Promise<void> {
    await this.showLoadingMessage(message, translate, false);
  }

  public setLoadingSpinnerMessage(message: string, translate = false): void {
    if (this.existingLoadingSpinners.length > 0) {
      let internMessage = '';
      if (translate === false) {
        internMessage = message;
      } else {
        internMessage = this.translate.instant(message);
      }
      this.eventQueue.dispatch(
        new AppEvent(
          AppEventType.UPDATE_LOADING_SPINNER_MESSAGE,
          internMessage,
        ),
      );
    }
  }

  public isLoadingSpinnerShown(): boolean {
    return this.existingLoadingSpinners?.length > 0;
  }

  public async hideLoadingSpinner(): Promise<void> {
    if (this.existingLoadingSpinners.length > 0) {
      for (const spinner of this.existingLoadingSpinners) {
        await spinner.dismiss();
      }
      this.existingLoadingSpinners = [];
    }
  }

  public async showAppShetItSelfMessage(): Promise<void> {
    const modal = await this.modalController.create({
      component: FilesystemErrorPopoverComponent,
      cssClass: 'half-bottom-modal',
      showBackdrop: true,
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async showMessage(
    _message: string,
    _title?: string,
    _ok?: string,
    _translate?: boolean,
  ): Promise<void> {
    let okText = this.translate.instant('OK');
    if (_translate === true) {
      _message = this.translate.instant(_message);

      if (_title) {
        _title = this.translate.instant(_title);
      }
      if (_ok) {
        _ok = this.translate.instant(_ok);
      }
    }
    if (_ok) {
      okText = _ok;
    }
    const alert = await this.alertController.create({
      header: _title,
      message: _message,
      buttons: [{ text: okText }],
    });
    await alert.present();
    await alert.onDidDismiss();
  }

  public async copyLogfiles(): Promise<void> {
    const modal = await this.modalController.create({
      component: LogTextComponent,
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async showIOSIndexedDBIssues(
    _message: string,
    _title?: string,
    _translate?: boolean,
  ): Promise<void> {
    if (_translate === true) {
      _message = this.translate.instant(_message);

      if (_title) {
        _title = this.translate.instant(_title);
      }
    }

    const alert = await this.alertController.create({
      header: _title,
      message: _message,
      cssClass: 'ios-indexeddbissues',
      backdropDismiss: false,
      buttons: [
        {
          text: this.translate.instant('RELOAD_APP'),
          handler: () => {
            window.location.reload();
            return false;
          },
        },
      ],
    });
    await alert.present();
    // This should never resolve, as the app reloads when clicking the button
    await alert.onDidDismiss();
  }

  public async showConfirm(
    _message: string,
    _title?: string,
    _translate?: boolean,
  ): Promise<void> {
    await this.showConfirmWithYesNoTranslation(
      _message,
      _title,
      undefined,
      undefined,
      _translate,
    );
  }

  public async showConfirmWithYesNoTranslation(
    _message: string,
    _title?: string,
    _yesText?: string,
    _noText?: string,
    _translate?: boolean,
  ): Promise<void> {
    let yesText = this.translate.instant('YES');
    let noText = this.translate.instant('NO');
    if (_translate === true) {
      _message = this.translate.instant(_message);

      if (_title) {
        _title = this.translate.instant(_title);
      }
      if (_yesText) {
        yesText = this.translate.instant(_yesText);
      }
      if (_noText) {
        noText = this.translate.instant(_noText);
      }
    }

    const alert = await this.alertController.create({
      header: _title,
      subHeader: _message,
      backdropDismiss: false,
      buttons: [
        {
          text: noText,
          role: 'cancel',
        },
        {
          text: yesText,
        },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'cancel') {
      // TODO: Change this method to return a result object that callers can
      //       check instead of using resolve() => ok; reject() => cancel
      throw new Error('cancelled');
    }
  }

  public async presentCustomPopover(
    _title: string,
    _description: string,
    _okText: string,
  ): Promise<void> {
    await this.showMessage(_description, _title, _okText, true);
  }

  public async showLoadingMessage(
    message = 'PLEASE_WAIT',
    translate = true,
    showDismissAfterSpecificTimeout = false,
  ): Promise<void> {
    if (this.existingLoadingSpinners.length > 0) {
      await this.hideLoadingSpinner();
    }

    let msg = message;
    if (translate) {
      msg = this.translate.instant(message);
    }

    const modal = await this.modalController.create({
      component: LoadingPopoverComponent,
      cssClass: 'loading-modal',
      animated: false,
      backdropDismiss: false,
      showBackdrop: true,
      componentProps: {
        showDismissAfterSpecificTimeout: showDismissAfterSpecificTimeout,
        message: msg,
      },
    });
    this.existingLoadingSpinners.push(modal);
    await modal.present();
  }
}
