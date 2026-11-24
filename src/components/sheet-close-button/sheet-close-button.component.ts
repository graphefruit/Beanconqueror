import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
} from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

/**
 * Closes the sheet it sits in, for sheets that have no cancel button of their
 * own. Sighted users swipe such a sheet down or tap beside it; screen readers
 * can do neither, and the grip either is hidden from them or only changes the
 * size. It goes last in the sheet and stays invisible until something
 * focuses it.
 */
@Component({
  selector: 'app-sheet-close-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `
    <button type="button" (click)="close()">
      {{ 'A11Y.CLOSE_DIALOG' | translate }}
    </button>
  `,
  styles: `
    button:not(:focus) {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      border: 0;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    button:focus {
      display: block;
      margin: 8px auto;
      padding: 8px 16px;
      color: var(--ion-color-primary);
      background: none;
      border: none;
    }
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
