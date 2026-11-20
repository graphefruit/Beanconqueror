import {
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { TranslateService } from '@ngx-translate/core';

import { translateIonicLabels } from '../services/a11y/ionic-labels';

type StencilElement = HTMLElement & {
  componentOnReady?: () => Promise<unknown>;
};

/**
 * Names the search field of an ion-searchbar after what it searches, and its
 * clear button in the app language. Ionic names them "search text" and
 * "reset" in English and passes no name from the host to the field.
 */
@Directive({ selector: 'ion-searchbar[searchName]' })
export class SearchbarNameDirective {
  private readonly host =
    inject<ElementRef<StencilElement>>(ElementRef).nativeElement;
  private readonly translate = inject(TranslateService);

  /** What the field searches, e.g. "Search beans". */
  public readonly searchName = input.required<string>();

  private readonly rendered = signal(false);
  private readonly language = toSignal(this.translate.onLangChange);

  constructor() {
    // ion-searchbar renders its field into the light DOM once it has loaded.
    const loaded = this.host.componentOnReady?.() ?? Promise.resolve();
    void loaded.then(() => this.rendered.set(true));

    effect(() => {
      const name = this.searchName();
      this.language();
      if (!this.rendered()) {
        return;
      }
      this.host
        .querySelector('input.searchbar-input')
        ?.setAttribute('aria-label', name);
      translateIonicLabels(this.host, this.translate);
    });
  }
}
