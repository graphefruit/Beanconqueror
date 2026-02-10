import { inject, Injectable } from '@angular/core';

import {
  AlertController,
  LoadingController,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';

import { LogTextComponent } from '../app/info/log/log-text/log-text.component';
import { AppEvent } from '../classes/appEvent/appEvent';
import { AppEventType } from '../enums/appEvent/appEvent';
import { FilesystemErrorPopoverComponent } from '../popover/filesystem-error-popover/filesystem-error-popover.component';
import { LoadingPopoverComponent } from '../popover/loading-popover/loading-popover.component';
import { EventQueueService } from './queueService/queue-service.service';
import { UILog } from './uiLog';

declare var window;
@Injectable({
  providedIn: 'root',
})
export class UIAlert {
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);
  private readonly modalController = inject(ModalController);
  private readonly loadingController = inject(LoadingController);
  private readonly uiLog = inject(UILog);
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

  private existingLoadingSpinners = [];

  public async showLoadingSpinner(
    message: string = 'PLEASE_WAIT',
    translate: boolean = true,
  ) {
    await this.showLoadingMessage(message, translate, false);
    /**if (this.existingLoadingSpinners.length > 0) {
          await this.hideLoadingSpinner();
        }
        let msg = message;
        if (translate) {
          msg = this.translate.instant(message);
        }
        const loadingSpinner = await this.loadingController.create({
          animated: false,
          message: msg,
        });
        this.existingLoadingSpinners.push(loadingSpinner);
        loadingSpinner.present();**/
  }

  public setLoadingSpinnerMessage(message: string, translate: boolean = false) {
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

  public isLoadingSpinnerShown() {
    return this.existingLoadingSpinners?.length > 0;
  }
  public async hideLoadingSpinner() {
    if (this.existingLoadingSpinners.length > 0) {
      for (const spinner of this.existingLoadingSpinners) {
        spinner.dismiss();
        await new Promise(async (resolve) => {
          setTimeout(() => {
            resolve(undefined);
          }, 50);
        });
      }
      this.existingLoadingSpinners = [];
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
    _translate?: boolean,
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
  public async copyLogfiles(): Promise<any> {
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
  ): Promise<any> {
    if (_translate === true) {
      _message = this.translate.instant(_message);

      if (_title) {
        _title = this.translate.instant(_title);
      }
    }

    const promise = new Promise(async (resolve, reject) => {
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
    });

    return promise;
  }
  public async showConfirm(
    _message: string,
    _title?: string,
    _translate?: boolean,
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
  public async showConfirmWithYesNoTranslation(
    _message: string,
    _title?: string,
    _yesText?: string,
    _noText?: string,
    _translate?: boolean,
  ): Promise<any> {
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

    return new Promise(async (resolve, reject) => {
      const alert = await this.alertController.create({
        header: _title,
        subHeader: _message,
        backdropDismiss: false,
        buttons: [
          {
            text: noText,
            role: 'cancel',
            handler: () => {
              reject();
            },
          },
          {
            text: yesText,
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
    _okText: string,
  ) {
    await this.showMessage(_description, _title, _okText, true);
  }

  public async showLoadingMessage(
    message: string = 'PLEASE_WAIT',
    translate: boolean = true,
    showDismissAfterSpecificTimeout: boolean = false,
  ) {
    // this.uiLog.generateExceptionLineMessage('Loading-Spinner');
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
    modal.present();
  }
}
