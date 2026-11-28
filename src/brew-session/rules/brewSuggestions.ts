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

/** A vessel of an earlier brew: picking it sets the name and the weight. */
export interface StoredVessel {
  name: string;
  weight: number;
}

/** How a vessel reads in the suggestions; one without weight by its name. */
export function vesselLabel({ name, weight }: StoredVessel): string {
  // Weights typed into the form are stored as text.
  const grams = String(weight ?? '').trim();
  return grams === '' || grams === '0' ? name : `${name} – ${grams} g`;
}

/**
 * The vessels of the brews with a name, each pair of name and weight once,
 * in the order of the brews.
 */
export function storedVessels(
  brews: readonly Partial<Pick<Brew, 'vessel_name' | 'vessel_weight'>>[],
): StoredVessel[] {
  const vessels = new Map<string, StoredVessel>();
  for (const brew of brews) {
    const name =
      typeof brew.vessel_name === 'string' ? brew.vessel_name.trim() : '';
    if (name === '') {
      continue;
    }
    const vessel = { name, weight: brew.vessel_weight ?? 0 };
    const label = vesselLabel(vessel);
    if (!vessels.has(label)) {
      vessels.set(label, vessel);
    }
  }
  return [...vessels.values()];
}
