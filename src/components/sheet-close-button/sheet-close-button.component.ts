import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
} from '@angular/core';

import { IonButton } from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { ScreenReaderState } from '../../services/a11y/screen-reader-state.service';

/**
 * Closes the sheet it sits in, for sheets that have no cancel button of their
 * own, while VoiceOver or TalkBack is on. Everybody else swipes such a sheet
 * down or taps beside it; screen readers can do neither, and the grip either
 * is hidden from them or only changes the size. It goes last in the sheet.
 */
@Component({
  selector: 'app-sheet-close-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, TranslatePipe],
  template: `
    @if (screenReaderOn()) {
      <ion-button
        class="ion-margin-horizontal"
        color="dark"
        expand="block"
        fill="clear"
        (click)="close()"
      >
        {{ 'A11Y.CLOSE_DIALOG' | translate }}
      </ion-button>
    }
  `,
})
export class SheetCloseButtonComponent {
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly screenReaderOn = inject(ScreenReaderState).on;

  public async close(): Promise<void> {
    // Like a tap beside the sheet: the caller gets no data.
    await this.host.closest('ion-modal')?.dismiss(undefined, 'cancel');
  }
}
