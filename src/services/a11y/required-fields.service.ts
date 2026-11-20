import { inject, Service } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { Announcer } from './announcer.service';

/** A required ion-input or ion-textarea, as far as it is used here. */
type RequiredField = HTMLElement & {
  value?: unknown;
  errorText?: string;
  setFocus?: () => Promise<void>;
};

/** A value that counts as not filled in: nothing, or only spaces. */
export function isBlank(value: unknown): boolean {
  return typeof value === 'string'
    ? value.trim() === ''
    : value === null || value === undefined;
}

/**
 * Says why a form was not saved. A form checks its required fields itself and
 * calls `report` when saving failed: every required field left blank shows
 * its error text, which Ionic then links to the field and marks it invalid,
 * the first of them takes the focus, and the error is announced once per
 * attempt.
 */
@Service()
export class RequiredFields {
  private readonly announcer = inject(Announcer);
  private readonly translate = inject(TranslateService);

  /**
   * Marks the blank required fields in `form` and announces the error of the
   * first one. A field the form does not show at the moment, e.g. on another
   * tab, cannot be marked; the error is announced all the same.
   */
  public report(form: Element): void {
    const blank = [
      ...form.querySelectorAll<RequiredField>(
        'ion-input[required], ion-textarea[required]',
      ),
    ].filter((field) => isBlank(field.value));
    for (const field of blank) {
      // Ionic makes its error text a second live region; the announcement
      // below is the one that is spoken.
      field.querySelector('.error-text')?.removeAttribute('role');
      // The classes Ionic shows the error text for, set by Angular forms on blur.
      field.classList.add('ion-touched', 'ion-invalid');
    }
    const [first] = blank;
    void first?.setFocus?.();
    this.announcer.announce(
      first?.errorText || String(this.translate.instant('NAME_REQUIRED')),
    );
  }
}
