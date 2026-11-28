import { storedBrewTexts } from '../brewSuggestions';

describe('storedBrewTexts', () => {
  it('lists the trimmed texts of the field in the order of the brews', () => {
    const brews = [
      { pressure_profile: ' Blooming ', coffee_type: 'Lungo' },
      { pressure_profile: 'Turbo', coffee_type: 'Ristretto' },
    ];

    expect(storedBrewTexts(brews, 'pressure_profile')).toEqual([
      'Blooming',
      'Turbo',
    ]);
    expect(storedBrewTexts(brews, 'coffee_type')).toEqual([
      'Lungo',
      'Ristretto',
    ]);
  });

  it('leaves out empty texts and brews without the field', () => {
    const brews = [
      { coffee_type: '' },
      { coffee_type: '   ' },
      {},
      { coffee_type: null as unknown as string },
      { coffee_type: 'Espresso' },
    ];

    expect(storedBrewTexts(brews, 'coffee_type')).toEqual(['Espresso']);
  });
});
