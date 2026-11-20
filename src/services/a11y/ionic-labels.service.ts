import { DestroyRef, DOCUMENT, inject, Service } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateService } from '@ngx-translate/core';

import { translateIonicLabels } from './ionic-labels';

/**
 * Gives the grip of sheet modals the app's name instead of Ionic's English
 * one, for every modal, when it opens and when the app language changes.
 * Where the grip does nothing (handleBehavior 'none', which Ionic leaves out
 * of the tab order), screen readers skip it instead of offering a button
 * without function.
 */
@Service()
export class IonicLabelsService {
  private readonly document = inject(DOCUMENT);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  public start(): void {
    this.document.addEventListener(
      'ionModalWillPresent',
      this.onModalWillPresent,
      true,
    );
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        for (const modal of this.document.querySelectorAll('ion-modal')) {
          this.labelModal(modal);
        }
      });
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener(
        'ionModalWillPresent',
        this.onModalWillPresent,
        true,
      ),
    );
  }

  private readonly onModalWillPresent = (event: Event): void => {
    if (event.target instanceof HTMLElement) {
      this.labelModal(event.target);
    }
  };

  private labelModal(modal: HTMLElement): void {
    const root = modal.shadowRoot;
    if (!root) {
      return;
    }
    const handle = root.querySelector<HTMLElement>('.modal-handle');
    if (handle && handle.tabIndex < 0) {
      handle.setAttribute('aria-hidden', 'true');
    }
    translateIonicLabels(root, this.translate);
  }
}
