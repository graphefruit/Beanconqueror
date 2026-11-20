import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  NgZone,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateService } from '@ngx-translate/core';

import { translateIonicLabels } from '../services/a11y/ionic-labels';

type DatetimeElement = HTMLElement & {
  locale?: string;
  componentOnReady?: () => Promise<unknown>;
};

/**
 * Shows ion-datetime in the app language: month and day names (Ionic takes
 * them from the browser language otherwise) and the names of its buttons,
 * which Ionic writes in English. Ionic renders some names again, e.g. when the
 * year selection opens, so they are translated whenever they change.
 */
@Directive({ selector: 'ion-datetime' })
export class DatetimeLanguageDirective {
  private readonly host =
    inject<ElementRef<DatetimeElement>>(ElementRef).nativeElement;
  private readonly translate = inject(TranslateService);

  constructor() {
    const destroyRef = inject(DestroyRef);
    const zone = inject(NgZone);
    this.applyLocale();
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.applyLocale();
        this.translateLabels();
      });

    let observer: MutationObserver | undefined;
    const loaded = this.host.componentOnReady?.() ?? Promise.resolve();
    void loaded.then(() => {
      const root = this.host.shadowRoot;
      if (!root || destroyRef.destroyed) {
        return;
      }
      this.translateLabels();
      // Only attributes in Ionic's shadow root change, no Angular state.
      zone.runOutsideAngular(() => {
        observer = new MutationObserver(() => this.translateLabels());
        observer.observe(root, {
          subtree: true,
          childList: true,
          attributeFilter: ['aria-label'],
        });
      });
    });
    destroyRef.onDestroy(() => observer?.disconnect());
  }

  private applyLocale(): void {
    const language = this.translate.getCurrentLang();
    if (language) {
      // App language codes use an underscore (zh_TW), Intl expects zh-TW.
      this.host.locale = language.replace('_', '-');
    }
  }

  private translateLabels(): void {
    if (this.host.shadowRoot) {
      translateIonicLabels(this.host.shadowRoot, this.translate);
    }
  }
}
