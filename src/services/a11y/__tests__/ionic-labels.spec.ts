import { translateIonicLabels } from '../ionic-labels';

const GERMAN: Record<string, string> = {
  'A11Y.RESIZE_DIALOG': 'Dialoggröße ändern',
  'A11Y.CLEAR_SEARCH': 'Suche leeren',
  'A11Y.PREVIOUS_MONTH': 'Vorheriger Monat',
  'A11Y.SHOW_YEAR_PICKER': 'Monats- und Jahresauswahl anzeigen',
  'A11Y.HIDE_YEAR_PICKER': 'Monats- und Jahresauswahl ausblenden',
  TODAY: 'Heute',
};
const ENGLISH: Record<string, string> = {
  'A11Y.RESIZE_DIALOG': 'Resize dialog',
};

function translator(texts: Record<string, string>) {
  return { instant: (key: string) => texts[key] ?? key };
}

function button(root: ParentNode, label: string): HTMLElement {
  const element = document.createElement('button');
  element.setAttribute('aria-label', label);
  root.appendChild(element);
  return element;
}

describe('translateIonicLabels', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
  });

  it("replaces Ionic's English names and leaves the app's own names alone", () => {
    const grip = button(
      root,
      'Activate to adjust the size of the dialog overlaying the screen',
    );
    const clear = button(root, 'reset');
    const own = button(root, 'Save');

    translateIonicLabels(root, translator(GERMAN));

    expect(grip.getAttribute('aria-label')).toBe('Dialoggröße ändern');
    expect(clear.getAttribute('aria-label')).toBe('Suche leeren');
    expect(own.getAttribute('aria-label')).toBe('Save');
  });

  it('follows a change of language', () => {
    const grip = button(
      root,
      'Activate to adjust the size of the dialog overlaying the screen',
    );
    translateIonicLabels(root, translator(GERMAN));

    translateIonicLabels(root, translator(ENGLISH));

    expect(grip.getAttribute('aria-label')).toBe('Resize dialog');
  });

  it('translates a name Ionic has rendered again in English', () => {
    const toggle = button(root, 'Show year picker');
    translateIonicLabels(root, translator(GERMAN));

    toggle.setAttribute('aria-label', 'Hide year picker');
    translateIonicLabels(root, translator(GERMAN));

    expect(toggle.getAttribute('aria-label')).toBe(
      'Monats- und Jahresauswahl ausblenden',
    );
  });

  it('says "today" in the app language before the date of today', () => {
    const today = button(root, 'Today, Freitag, 20. November');
    const otherDay = button(root, 'Samstag, 21. November');

    translateIonicLabels(root, translator(GERMAN));

    expect(today.getAttribute('aria-label')).toBe(
      'Heute, Freitag, 20. November',
    );
    expect(otherDay.getAttribute('aria-label')).toBe('Samstag, 21. November');
  });

  it('takes a name Ionic has rendered since as it is', () => {
    const day = button(root, 'Today, Freitag, 20. November');
    translateIonicLabels(root, translator(GERMAN));

    // The calendar shows the next month in the same buttons.
    day.setAttribute('aria-label', 'Sonntag, 20. Dezember');
    translateIonicLabels(root, translator(GERMAN));

    expect(day.getAttribute('aria-label')).toBe('Sonntag, 20. Dezember');
  });

  it('reaches the native button of an ion-button', () => {
    // Not upgraded to Ionic's component: its shadow root is built here.
    const ionButton = document.implementation
      .createHTMLDocument('')
      .createElement('ion-button');
    const native = button(
      ionButton.attachShadow({ mode: 'open' }),
      'Previous month',
    );
    root.append(ionButton);

    translateIonicLabels(root, translator(GERMAN));

    expect(native.getAttribute('aria-label')).toBe('Vorheriger Monat');
  });

  it('ignores names that only match a property of plain objects', () => {
    const element = button(root, 'toString');

    translateIonicLabels(root, translator(GERMAN));

    expect(element.getAttribute('aria-label')).toBe('toString');
  });
});
