import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
} from '@angular/core';

import { IonButton } from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

/**
 * Closes the sheet it sits in, for sheets that have no cancel button of their
 * own. Sighted users can swipe such a sheet down or tap beside it; screen
 * readers can do neither, and the grip either is hidden from them or only
 * changes the size. It goes last in the sheet.
 */
@Component({
  selector: 'app-sheet-close-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, TranslatePipe],
  template: `
    <ion-button
      class="ion-margin-horizontal"
      color="dark"
      expand="block"
      fill="clear"
      (click)="close()"
    >
      {{ 'A11Y.CLOSE_DIALOG' | translate }}
    </ion-button>
  `,
})
export class SheetCloseButtonComponent {
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  public async close(): Promise<void> {
    // Like a tap beside the sheet: the caller gets no data.
    await this.host.closest('ion-modal')?.dismiss(undefined, 'cancel');
  }
}
