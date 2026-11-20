import { afterNextRender, inject, Injector, Service } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { Announcer } from './announcer.service';

/** A required ion-input or ion-textarea, as far as it is used here. */
type RequiredField = HTMLElement & {
  value?: unknown;
  errorText?: string;
  setFocus?: () => Promise<void>;
  componentOnReady?: () => Promise<unknown>;
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
  private readonly injector = inject(Injector);

  /**
   * Marks the blank required fields in `form` and announces the error of the
   * first one. A form whose fields are on tabs passes `showFields`, which
   * switches to the tab with the required fields; they are marked once it is
   * shown. A field the form does not show cannot be marked; the error is
   * announced all the same.
   */
  public async report(form: Element, showFields?: () => void): Promise<void> {
    if (showFields) {
      showFields();
      await new Promise<void>((shown) =>
        afterNextRender(shown, { injector: this.injector }),
      );
      // Ionic sets the classes of a field shown just now from Angular forms
      // in the next frame; marked before, the field would lose them again.
      await new Promise((frame) => requestAnimationFrame(frame));
    }
    const fields = [
      ...form.querySelectorAll<RequiredField>(
        'ion-input[required], ion-textarea[required]',
      ),
    ];
    // A field shown just now has no error text and nothing to focus before.
    await Promise.all(fields.map((field) => field.componentOnReady?.()));
    const blank = fields.filter((field) => isBlank(field.value));
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
