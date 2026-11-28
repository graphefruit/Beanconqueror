import { Brew } from '../../classes/brew/brew';

/** The free text fields of a brew that suggest what earlier brews hold. */
export type SuggestedBrewField = 'pressure_profile' | 'coffee_type';

/**
 * What the brews hold in `field`, trimmed and without empty ones, in the
 * order of the brews. Older or imported brews can lack the field.
 */
export function storedBrewTexts(
  brews: readonly Partial<Pick<Brew, SuggestedBrewField>>[],
  field: SuggestedBrewField,
): string[] {
  const texts: string[] = [];
  for (const brew of brews) {
    const text = brew[field];
    if (typeof text === 'string' && text.trim() !== '') {
      texts.push(text.trim());
    }
  }
  return texts;
}
