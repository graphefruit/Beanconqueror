import { WATER_TYPES } from '../../enums/water/waterTypes';
import { Water } from './water';

describe('Water', () => {
  it('sets defaults in constructor', () => {
    const water = new Water();
    expect(water.name).toBe('');
    expect(water.finished).toBe(false);
    expect(water.tds).toBe(0);
    expect(water.general_hardness_type).toBe('UNKNOWN');
  });

  it('initializes from object', () => {
    const water = new Water();
    water.initializeByObject({ name: 'Test Water' } as any);
    expect(water.name).toBe('Test Water');
  });

  it('detects photos', () => {
    const water = new Water();
    expect(water.hasPhotos()).toBe(false);
    water.attachments = ['photo'];
    expect(water.hasPhotos()).toBe(true);
  });

  it('maps icons for water types', () => {
    const water = new Water();
    const cases: Array<[WATER_TYPES, string]> = [
      [WATER_TYPES.CUSTOM_WATER, 'water-outline'],
      [
        WATER_TYPES.THIRD_WAVE_WATER_CLASSIC_LIGHT_ROAST_PROFILE,
        'beanconqueror-third-wave-water-classic-light-roast-profile',
      ],
      [
        WATER_TYPES.THIRD_WAVE_WATER_MEDIUM_ROAST_PROFILE,
        'beanconqueror-third-wave-water-medium-roast-profile',
      ],
      [
        WATER_TYPES.THIRD_WAVE_WATER_DARK_ROAST_PROFILE,
        'beanconqueror-third-wave-water-dark-roast-profile',
      ],
      [
        WATER_TYPES.THIRD_WAVE_WATER_ESPRESSO_MACHINE_PROFILE,
        'beanconqueror-third-wave-water-espresso-machine-profile',
      ],
      [
        WATER_TYPES.THIRD_WAVE_WATER_COLD_BREW_PROFILE,
        'beanconqueror-third-wave-water-cold-brew-profile',
      ],
      [
        WATER_TYPES.THIRD_WAVE_WATER_LOW_ACID_PROFILE,
        'beanconqueror-third-wave-water-low-acid-profile',
      ],
      [WATER_TYPES.PURE_COFFEE_WATER, 'beanconqueror-pure-coffee-water'],
    ];

    for (const [type, expected] of cases) {
      expect(water.getIcon(type)).toBe(expected);
    }

    expect(water.getIcon(WATER_TYPES.EMPIRICAL_WATER_SPRING)).toBe(
      'water-outline',
    );
  });
});
