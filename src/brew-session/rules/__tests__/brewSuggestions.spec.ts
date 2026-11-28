import {
  storedBrewTexts,
  storedVessels,
  vesselLabel,
} from '../brewSuggestions';

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

describe('storedVessels', () => {
  it('keeps vessels of the same name with another weight apart', () => {
    const brews = [
      { vessel_name: 'Carafe', vessel_weight: 300 },
      { vessel_name: 'Carafe', vessel_weight: 350 },
      { vessel_name: 'Carafe ', vessel_weight: 300 },
      { vessel_name: 'Cup', vessel_weight: 300 },
    ];

    expect(storedVessels(brews)).toEqual([
      { name: 'Carafe', weight: 300 },
      { name: 'Carafe', weight: 350 },
      { name: 'Cup', weight: 300 },
    ]);
  });

  it('takes a weight stored as text as the same vessel and keeps the first', () => {
    const typed = '300' as unknown as number;
    const brews = [
      { vessel_name: 'Carafe', vessel_weight: typed },
      { vessel_name: 'Carafe', vessel_weight: 300 },
    ];

    expect(storedVessels(brews)).toEqual([{ name: 'Carafe', weight: typed }]);
  });

  it('leaves out vessels without a name', () => {
    const brews = [
      { vessel_name: '', vessel_weight: 300 },
      { vessel_name: '  ', vessel_weight: 300 },
      { vessel_name: null as unknown as string, vessel_weight: 300 },
      { vessel_weight: 300 },
      { vessel_name: 'Cup' },
    ];

    expect(storedVessels(brews)).toEqual([{ name: 'Cup', weight: 0 }]);
  });
});

describe('vesselLabel', () => {
  it('names the vessel with its weight in grams', () => {
    expect(vesselLabel({ name: 'Carafe', weight: 312.5 })).toBe(
      'Carafe – 312.5 g',
    );
  });

  it('names a vessel without weight by its name only', () => {
    expect(vesselLabel({ name: 'Cup', weight: 0 })).toBe('Cup');
    expect(vesselLabel({ name: 'Cup', weight: '' as unknown as number })).toBe(
      'Cup',
    );
    expect(vesselLabel({ name: 'Cup', weight: undefined })).toBe('Cup');
  });
});
