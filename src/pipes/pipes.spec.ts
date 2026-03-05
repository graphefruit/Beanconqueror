import { PreparationDeviceType } from '../classes/preparationDevice';
import { BEAN_FUNCTION_PIPE_ENUM } from '../enums/beans/beanFunctionPipe';
import { BREW_FUNCTION_PIPE_ENUM } from '../enums/brews/brewFunctionPipe';
import { MILL_FUNCTION_PIPE_ENUM } from '../enums/mills/millFunctionPipe';
import { PREPARATION_FUNCTION_PIPE_ENUM } from '../enums/preparations/preparationFunctionPipe';
import { SETTING_FUNCTION_PIPE_ENUM } from '../enums/settings/settingFunctionPipe';
import { BeanFieldVisiblePipe } from './bean/beanFieldVisible';
import { BeanFunction } from './bean/beanFunction';
import { BrewFieldOrder } from './brew/brewFieldOrder';
import { BrewFieldVisiblePipe } from './brew/brewFieldVisible';
import { BrewFunction } from './brew/brewFunction';
import { EnumToArrayPipe } from './enumToArray';
import { FormatDatePipe } from './formatDate';
import { KeysPipe } from './keys';
import { MillFunction } from './mill/millFunction';
import { PreparationFunction } from './preparation/preparationFunction';
import { SettingFunction } from './setting/settingFunction';
import { ToFixedPipe } from './toFixed';

describe('Pipes', () => {
  it('ToFixedPipe formats values and handles invalid input', () => {
    const pipe = new ToFixedPipe();
    expect(pipe.transform(null, 2)).toBe(0);
    expect(pipe.transform(undefined, 2)).toBe(0);
    expect(pipe.transform('', 2)).toBe(0);
    expect(pipe.transform('abc', 2)).toBe(0);
    expect(pipe.transform('3.14159', 2)).toBe(3.14);
    expect(pipe.transform('3.14159', null)).toBe(3.14);
  });

  it('KeysPipe returns own keys only', () => {
    const pipe = new KeysPipe();
    const base = { inherited: true } as any;
    const obj = Object.create(base);
    obj.own = 1;
    expect(pipe.transform(obj)).toEqual(['own']);
  });

  it('EnumToArrayPipe returns object keys', () => {
    const pipe = new EnumToArrayPipe();
    const input = { ACTIVE: 0, INACTIVE: 1 };
    expect(pipe.transform(input)).toEqual(['ACTIVE', 'INACTIVE']);
  });

  it('FormatDatePipe formats dates and handles empty values', () => {
    const pipe = new FormatDatePipe();
    expect(pipe.transform(null, ['YYYY-MM-DD'])).toBe('');
    const localDate = new Date(2023, 0, 1);
    expect(pipe.transform(localDate, ['YYYY-MM-DD'])).toBe('2023-01-01');
    const defaultFormatted = pipe.transform(localDate, undefined);
    expect(typeof defaultFormatted).toBe('string');
    expect(defaultFormatted.length).toBeGreaterThan(0);
  });

  it('BrewFieldVisiblePipe returns the correct field based on custom settings', () => {
    const pipe = new BrewFieldVisiblePipe();
    expect(pipe.transform(true, [false, true, true])).toBe(true);
    expect(pipe.transform(true, [true, false, false])).toBe(true);
  });

  it('BrewFieldOrder returns the correct order based on custom settings', () => {
    const pipe = new BrewFieldOrder();
    expect(pipe.transform(true, [1, 2, true])).toBe(2);
    expect(pipe.transform(true, [1, 2, false])).toBe(1);
  });

  it('BeanFieldVisiblePipe returns settings value', () => {
    const pipe = new BeanFieldVisiblePipe();
    expect(pipe.transform(true, [true])).toBe(true);
    expect(pipe.transform(true, [false])).toBe(false);
  });

  it('BrewFunction executes all actions', () => {
    const pipe = new BrewFunction();
    const brew: any = {
      getExtractionYield: () => 1.1,
      getBrewRatio: () => 2.2,
      getFormattedTotalCoffeeTemperatureTime: () => 'temp-total',
      getFormattedTotalCoffeeBloomingTime: () => 'bloom-total',
      getFormattedTotalCoffeeFirstDripTime: () => 'drip-total',
      getFormattedTotalMillTimerTime: () => 'mill-total',
      getFormattedBrewTime: () => 'brew-time',
      getFormattedCoffeeBrewTime: () => 'coffee-brew-time',
      getFormattedTotalCoffeeBrewTime: () => 'total-coffee-brew-time',
      getCalculatedBeanAge: () => 5,
      isArchived: () => true,
      getGramsPerLiter: () => 60,
      getPreparationToolName: (id: string) => `tool-${id}`,
      getBean: () => ({ name: 'bean' }),
      getMill: () => ({ name: 'mill' }),
      getPreparation: () => ({ name: 'prep' }),
      getWater: () => ({ name: 'water' }),
      hasCustomFlavors: () => true,
      hasPredefinedFlavors: () => false,
      pressure_profile: 'http://example.com',
      hasPhotos: () => true,
    };

    expect(
      pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.GET_EXTRACTION_YIELD),
    ).toBe(1.1);
    expect(pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.GET_BREW_RATIO)).toBe(
      2.2,
    );
    expect(
      pipe.transform(
        brew,
        BREW_FUNCTION_PIPE_ENUM.FORMATTED_TOTAL_COFFEE_TEMPERATURE_TIME,
      ),
    ).toBe('temp-total');
    expect(
      pipe.transform(
        brew,
        BREW_FUNCTION_PIPE_ENUM.FORMATTED_TOTAL_COFFEE_BLOOMING_TIME,
      ),
    ).toBe('bloom-total');
    expect(
      pipe.transform(
        brew,
        BREW_FUNCTION_PIPE_ENUM.FORMATTED_TOTAL_COFFEE_FIRST_DRIP_TIME,
      ),
    ).toBe('drip-total');
    expect(
      pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.FORMATTED_TOTAL_MILL_TIME),
    ).toBe('mill-total');
    expect(
      pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.FORMATTED_BREW_TIME),
    ).toBe('brew-time');
    expect(
      pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.FORMATTED_COFFEE_BREW_TIME),
    ).toBe('coffee-brew-time');
    expect(
      pipe.transform(
        brew,
        BREW_FUNCTION_PIPE_ENUM.FORMATTED_TOTAL_COFFEE_BREW_TIME,
      ),
    ).toBe('total-coffee-brew-time');
    expect(
      pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.GET_CALCULATED_BEAN_AGE),
    ).toBe(5);
    expect(pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.IS_ARCHIVED)).toBe(
      true,
    );
    expect(
      pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.GET_GRAMS_PER_LITER),
    ).toBe(60);
    expect(
      pipe.transform(brew, [
        BREW_FUNCTION_PIPE_ENUM.GET_PREPARATION_TOOL_NAME,
        'abc',
      ]),
    ).toBe('tool-abc');
    expect(pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.GET_BEAN_NAME)).toBe(
      'bean',
    );
    expect(pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.GET_MILL_NAME)).toBe(
      'mill',
    );
    expect(
      pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.GET_PREPARATION_NAME),
    ).toBe('prep');
    expect(pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.GET_WATER_NAME)).toBe(
      'water',
    );
    expect(
      pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.HAS_CUSTOM_FLAVORS),
    ).toBe(true);
    expect(
      pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.HAS_PREDEFINED_FLAVORS),
    ).toBe(false);
    expect(
      pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.IS_PRESSURE_PARAMETER_URL),
    ).toBe(true);
    expect(pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.HAS_PHOTOS)).toBe(true);

    brew.pressure_profile = 'profile';
    expect(
      pipe.transform(brew, BREW_FUNCTION_PIPE_ENUM.IS_PRESSURE_PARAMETER_URL),
    ).toBe(false);
  });

  it('BeanFunction executes all actions', () => {
    const pipe = new BeanFunction();
    const bean: any = {
      isFrozen: () => true,
      isUnfrozen: () => false,
      isScannedBean: () => true,
      hasPhotos: () => false,
      hasFrozenInformation: () => true,
      beanAgeInDays: () => 10,
      hasCustomFlavors: () => true,
      hasPredefinedFlavors: () => false,
      isSelfRoasted: () => true,
      weight: 200,
      cost: 10,
    };

    expect(pipe.transform(bean, BEAN_FUNCTION_PIPE_ENUM.IS_FROZEN)).toBe(true);
    expect(pipe.transform(bean, BEAN_FUNCTION_PIPE_ENUM.IS_UNFROZEN)).toBe(
      false,
    );
    expect(pipe.transform(bean, BEAN_FUNCTION_PIPE_ENUM.IS_SCANNED_BEAN)).toBe(
      true,
    );
    expect(pipe.transform(bean, BEAN_FUNCTION_PIPE_ENUM.HAS_PHOTOS)).toBe(
      false,
    );
    expect(
      pipe.transform(bean, BEAN_FUNCTION_PIPE_ENUM.HAS_FROZEN_INFORMATION),
    ).toBe(true);
    expect(pipe.transform(bean, BEAN_FUNCTION_PIPE_ENUM.BEAN_AGE_IN_DAYS)).toBe(
      10,
    );
    expect(
      pipe.transform(bean, BEAN_FUNCTION_PIPE_ENUM.HAS_CUSTOM_FLAVORS),
    ).toBe(true);
    expect(
      pipe.transform(bean, BEAN_FUNCTION_PIPE_ENUM.HAS_PREDEFINED_FLAVORS),
    ).toBe(false);
    expect(pipe.transform(bean, BEAN_FUNCTION_PIPE_ENUM.IS_SELF_ROASTED)).toBe(
      true,
    );
    expect(pipe.transform(bean, BEAN_FUNCTION_PIPE_ENUM.SHOW_COST_PER_KG)).toBe(
      true,
    );

    const beanNoCost: any = { weight: 1000, cost: 10 };
    expect(
      pipe.transform(beanNoCost, BEAN_FUNCTION_PIPE_ENUM.SHOW_COST_PER_KG),
    ).toBe(false);
  });

  it('MillFunction executes all actions', () => {
    const pipe = new MillFunction();
    const mill: any = { hasPhotos: () => true };
    expect(pipe.transform(mill, MILL_FUNCTION_PIPE_ENUM.HAS_PHOTOS)).toBe(true);
  });

  it('PreparationFunction executes all actions', () => {
    const pipe = new PreparationFunction();
    const preparation: any = {
      hasPhotos: () => true,
      getIcon: () => 'icon',
      connectedPreparationDevice: { type: PreparationDeviceType.SANREMO_YOU },
    };

    expect(
      pipe.transform(preparation, PREPARATION_FUNCTION_PIPE_ENUM.HAS_PHOTOS),
    ).toBe(true);
    expect(
      pipe.transform(preparation, PREPARATION_FUNCTION_PIPE_ENUM.GET_ICON),
    ).toBe('icon');
    expect(
      pipe.transform(
        preparation,
        PREPARATION_FUNCTION_PIPE_ENUM.HAS_DEVICE_CONNECTION,
      ),
    ).toBe(true);
    expect(
      pipe.transform(
        preparation,
        PREPARATION_FUNCTION_PIPE_ENUM.IS_SANREMO_CONNECTION,
      ),
    ).toBe(true);
    expect(
      pipe.transform(
        preparation,
        PREPARATION_FUNCTION_PIPE_ENUM.IS_XENIA_CONNECTION,
      ),
    ).toBe(false);

    preparation.connectedPreparationDevice.type = PreparationDeviceType.NONE;
    expect(
      pipe.transform(
        preparation,
        PREPARATION_FUNCTION_PIPE_ENUM.HAS_DEVICE_CONNECTION,
      ),
    ).toBe(false);
  });

  it('SettingFunction exposes section flags', () => {
    const pipe = new SettingFunction();
    const settings: any = {
      show_roasting_section: true,
      show_water_section: false,
      show_graph_section: true,
    };

    expect(
      pipe.transform(
        settings,
        SETTING_FUNCTION_PIPE_ENUM.SHOW_ROASTING_SECTION,
      ),
    ).toBe(true);
    expect(
      pipe.transform(settings, SETTING_FUNCTION_PIPE_ENUM.SHOW_WATER_SECTION),
    ).toBe(false);
    expect(
      pipe.transform(settings, SETTING_FUNCTION_PIPE_ENUM.SHOW_GRAPH_SECTION),
    ).toBe(true);
  });
});
