import de from '../../../assets/i18n/de.json';
import en from '../../../assets/i18n/en.json';

/**
 * The names screen readers speak for controls without visible text live under
 * `A11Y`. Other languages fall back to English, German has to be complete.
 */
describe('A11Y translations', () => {
  const english: Record<string, string> = en.A11Y;
  const german: Record<string, string> = de.A11Y;
  const placeholders = (text: string) =>
    (text.match(/{{\s*\w+\s*}}/g) ?? []).sort();

  it('has every name in English and in German', () => {
    expect(Object.keys(german).sort()).toEqual(Object.keys(english).sort());
  });

  it('has no empty name and keeps the placeholders', () => {
    for (const key of Object.keys(english)) {
      expect(english[key].trim()).withContext(`en ${key}`).not.toBe('');
      expect(german[key]?.trim()).withContext(`de ${key}`).toBeTruthy();
      expect(placeholders(german[key] ?? ''))
        .withContext(`de ${key}`)
        .toEqual(placeholders(english[key]));
    }
  });
});
