import { inject, Injectable } from '@angular/core';

import { AlertController } from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';

export type ConfirmationDialogResult = 'YES' | 'NO';

export interface GmConfirmDialogHandle {
  dismiss: (data?: any, role?: string) => Promise<boolean>;
  result: Promise<ConfirmationDialogResult>;
}

@Injectable({
  providedIn: 'root',
})
export class gaggimateModal {
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  /**
   * Shows a modal confirmation dialog with a message and 'Yes' and 'No'
   * buttons. The button text can be customized using the arguments.
   *
   * Resolves when the modal has been dismissed and returns the choice.
   */

  public async showDismissableConfirmWithYesNoTranslation(
    _message: string,
    _title?: string,
    _yesText?: string,
    _noText?: string,
    _translate?: boolean,
  ): Promise<GmConfirmDialogHandle> {
    let yesText = this.translate.instant('YES');
    let noText = this.translate.instant('NO');

    if (_translate === true) {
      _message = this.translate.instant(_message);
      if (_title) _title = this.translate.instant(_title);
      if (_yesText) yesText = this.translate.instant(_yesText);
      if (_noText) noText = this.translate.instant(_noText);
    }

    const alert = await this.alertController.create({
      header: _title,
      subHeader: _message,
      backdropDismiss: false,
      buttons: [
        { text: noText, role: 'cancel' },
        { text: yesText, role: 'confirm' },
      ],
    });

    await alert.present();

    return {
      // Closes the alert
      dismiss: (data?: any, role?: string) => alert.dismiss(data, role),

      // Outcome promise: resolves when closed (manually or programmatically)
      result: alert
        .onDidDismiss()
        .then(({ role }) => (role === 'cancel' ? 'NO' : 'YES')),
    };
  }
}
