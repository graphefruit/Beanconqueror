import { ChangeDetectorRef, Directive, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { TranslateService } from '@ngx-translate/core';
import { NgxStarsComponent } from 'ngx-stars';

import { rangeValueText } from './range-name.directive';

/**
 * Names ngx-stars in the app language, e.g. "Bewertung: 3,5 von 5 Sternen".
 * ngx-stars writes "Rating: 3.5 out of 5 stars" in English and has no option
 * for it.
 */
@Directive({ selector: 'ngx-stars' })
export class StarsNameDirective {
  /** What the stars show, e.g. "Degree of Roast"; the rating if not given. */
  public readonly starsName = input<string>();

  constructor() {
    const stars = inject(NgxStarsComponent, { self: true });
    const translate = inject(TranslateService);
    // ngx-stars binds its name to this method on every change detection.
    stars.getAriaLabel = () =>
      String(
        translate.instant('A11Y.STARS', {
          name: this.starsName() ?? translate.instant('BREW_DATA_RATING'),
          rating: rangeValueText(
            stars.rating,
            0.5,
            '',
            translate.getCurrentLang() ?? 'en',
          ),
          max: stars.maxStars,
        }),
      );
    // The stars are not checked again on their own when only the language
    // or, set from code, the rating changed.
    const changes = inject(ChangeDetectorRef);
    const setRating = stars.setRating.bind(stars);
    stars.setRating = (rating: number) => {
      setRating(rating);
      changes.markForCheck();
    };
    translate.onLangChange
      .pipe(takeUntilDestroyed())
      .subscribe(() => changes.markForCheck());
  }
}
