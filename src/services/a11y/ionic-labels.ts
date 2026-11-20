import type { TranslateService } from '@ngx-translate/core';

/**
 * Names Ionic 9 writes in English into the shadow roots of its components,
 * whatever the app language, with the key of the app's own text for each.
 * Ionic has no option for any of them.
 */
const IONIC_LABELS: ReadonlyMap<string, string> = new Map([
  // Grip of sheet modals.
  [
    'Activate to adjust the size of the dialog overlaying the screen',
    'A11Y.RESIZE_DIALOG',
  ],
  // Clear button of ion-searchbar.
  ['reset', 'A11Y.CLEAR_SEARCH'],
  // Calendar of ion-datetime.
  ['Previous month', 'A11Y.PREVIOUS_MONTH'],
  ['Next month', 'A11Y.NEXT_MONTH'],
  ['Show year picker', 'A11Y.SHOW_YEAR_PICKER'],
  ['Hide year picker', 'A11Y.HIDE_YEAR_PICKER'],
  ['Select a month', 'A11Y.SELECT_MONTH'],
  ['Select a year', 'A11Y.SELECT_YEAR'],
  // Wheel columns of ion-datetime.
  ['Select a date', 'A11Y.SELECT_DATE'],
  ['Select a day', 'A11Y.SELECT_DAY'],
  ['Select an hour', 'A11Y.SELECT_HOUR'],
  ['Select a minute', 'A11Y.SELECT_MINUTE'],
  ['Select a day period', 'A11Y.SELECT_DAY_PERIOD'],
]);

/**
 * ion-datetime puts this before the name of today in the calendar, e.g.
 * "Today, Friday, 20. November"; the date itself follows the locale.
 */
const TODAY = 'Today, ';

/**
 * Ionic's English name and the name written instead of it, so a change of
 * language finds the element again. A name Ionic has rendered since is not
 * the written one any more and is taken as it is.
 */
const IONIC_LABEL = 'data-ionic-label';
const WRITTEN_LABEL = 'data-written-label';

/**
 * Replaces Ionic's English names in `root` by the app's texts. Buttons Ionic
 * renders as ion-button carry their name inside their own shadow root, which
 * is searched as well. Ionic writes a name again only when it renders a
 * different one, so a replaced name holds until then; call this again after
 * that and after the app language changed.
 */
export function translateIonicLabels(
  root: ParentNode,
  translate: Pick<TranslateService, 'instant'>,
): void {
  for (const element of root.querySelectorAll('[aria-label]')) {
    const label = element.getAttribute('aria-label') ?? '';
    const english = isIonicLabel(label)
      ? label
      : label === element.getAttribute(WRITTEN_LABEL)
        ? element.getAttribute(IONIC_LABEL)
        : null;
    if (!english) {
      continue;
    }
    const text = english.startsWith(TODAY)
      ? `${String(translate.instant('TODAY'))}, ${english.slice(TODAY.length)}`
      : String(translate.instant(IONIC_LABELS.get(english)));
    element.setAttribute(IONIC_LABEL, english);
    element.setAttribute(WRITTEN_LABEL, text);
    if (label !== text) {
      element.setAttribute('aria-label', text);
    }
  }
  for (const button of root.querySelectorAll('ion-button')) {
    if (button.shadowRoot) {
      translateIonicLabels(button.shadowRoot, translate);
    }
  }
}

function isIonicLabel(label: string): boolean {
  return IONIC_LABELS.has(label) || label.startsWith(TODAY);
}
