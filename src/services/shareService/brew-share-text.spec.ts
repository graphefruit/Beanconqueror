import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
import { Mill } from '../../classes/mill/mill';
import { ShareBrewTextFields } from '../../classes/parameter/shareBrewTextFields';
import { Preparation } from '../../classes/preparation/preparation';
import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';
import { formatBrewShareText } from './brew-share-text';

describe('formatBrewShareText', () => {
  const labels: Record<string, string> = {
    BEAN_DATA_NAME: 'Nombre',
    BEAN_DATA_ROASTER: 'Tostador',
    BEAN_DATA_COUNTRY: 'País',
    BEAN_DATA_VARIETY: 'Variedad',
    BEAN_DATA_PROCESSING: 'Proceso',
    BREW_DATA_PREPARATION_METHOD: 'Método',
    BREW_DATA_GRIND_WEIGHT: 'Café molido',
  };
  const translate = (key: string) => labels[key] ?? key;

  it('uses translated labels and preserves user-entered values for every origin', () => {
    const brew = new Brew();
    brew.grind_weight = 18;
    const bean = new Bean();
    bean.name = 'House blend';
    bean.bean_information = [
      { country: 'Etiopía', variety: 'Heirloom', processing: 'Natural' },
      { country: 'Colombia', variety: 'Caturra', processing: 'Lavado' },
    ] as Bean['bean_information'];
    const preparation = new Preparation();
    preparation.name = 'V60';

    const text = formatBrewShareText(
      brew,
      bean,
      preparation,
      new Mill(),
      new ShareBrewTextFields(),
      translate,
      'es',
    );

    expect(text).toContain('Nombre: House blend');
    expect(text).toContain(
      '1. País: Etiopía\n1. Variedad: Heirloom\n1. Proceso: Natural',
    );
    expect(text).toContain(
      '2. País: Colombia\n2. Variedad: Caturra\n2. Proceso: Lavado',
    );
    expect(text).toContain('2. Proceso: Lavado\n- - - - - - -\nMétodo: V60');
    expect(text).toContain('Método: V60');
    expect(text).toContain('Café molido: 18 g');
  });

  it('uses the visible unit for water and beverage quantities', () => {
    const brew = new Brew();
    brew.brew_quantity = 200;
    brew.brew_quantity_type = 'ML' as typeof brew.brew_quantity_type;
    brew.brew_beverage_quantity = 180;
    brew.brew_beverage_quantity_type =
      'GR' as typeof brew.brew_beverage_quantity_type;

    const text = formatBrewShareText(
      brew,
      new Bean(),
      new Preparation(),
      new Mill(),
      new ShareBrewTextFields(),
      translate,
      'en',
    );

    expect(text).toContain('BREW_DATA_BREW_QUANTITY: 200 ml');
    expect(text).toContain('BREW_DATA_BREW_BEVERAGE_QUANTITY: 180 gr');
  });

  it('omits empty fields and fields disabled in the global settings', () => {
    const brew = new Brew();
    brew.note = 'Buen café';
    const bean = new Bean();
    bean.name = 'Kenya';
    bean.bean_information = [
      { country: 'Kenya', variety: '', processing: '' },
    ] as Bean['bean_information'];
    const fields = new ShareBrewTextFields();
    fields.bean_country = false;
    fields.note = true;

    const text = formatBrewShareText(
      brew,
      bean,
      new Preparation(),
      new Mill(),
      fields,
      translate,
      'es',
    );

    expect(text).toContain('Nombre: Kenya');
    expect(text).toContain('BREW_DATA_NOTES: Buen café');
    expect(text).not.toContain('País');
    expect(text).not.toContain('undefined');
  });

  it('does not number a single populated origin after an empty origin', () => {
    const bean = new Bean();
    bean.bean_information = [
      { country: '', variety: '', processing: '' },
      { country: 'Kenya', variety: '', processing: '' },
    ] as Bean['bean_information'];

    const text = formatBrewShareText(
      new Brew(),
      bean,
      new Preparation(),
      new Mill(),
      new ShareBrewTextFields(),
      translate,
      'es',
    );

    expect(text).toContain('País: Kenya');
    expect(text).not.toContain('2. País: Kenya');
  });

  it('shares TDS and EY independently when the calculation has enough data', () => {
    const brew = new Brew();
    brew.tds = 1.25;
    brew.grind_weight = 20;
    brew.brew_beverage_quantity = 300;
    const fields = new ShareBrewTextFields();
    spyOn(brew, 'getPreparation').and.returnValue(new Preparation());

    const text = formatBrewShareText(
      brew,
      new Bean(),
      new Preparation(),
      new Mill(),
      fields,
      translate,
      'es',
    );

    expect(text).toContain('TDS: 1,25 %');
    expect(text).toContain('EY: 18,75 %');
    fields.extraction_yield = false;
    expect(
      formatBrewShareText(
        brew,
        new Bean(),
        new Preparation(),
        new Mill(),
        fields,
        translate,
        'es',
      ),
    ).not.toContain('EY:');
  });

  it('uses water quantity for immersion EY and omits EY without a dose', () => {
    const brew = new Brew();
    brew.tds = 1.2;
    brew.grind_weight = 20;
    brew.brew_quantity = 300;
    brew.brew_beverage_quantity = 200;
    const preparation = new Preparation();
    preparation.style_type = PREPARATION_STYLE_TYPE.FULL_IMMERSION;
    spyOn(brew, 'getPreparation').and.returnValue(preparation);

    const text = formatBrewShareText(
      brew,
      new Bean(),
      preparation,
      new Mill(),
      new ShareBrewTextFields(),
      translate,
      'en',
    );
    expect(text).toContain('EY: 18 %');

    brew.grind_weight = 0;
    const withoutDose = formatBrewShareText(
      brew,
      new Bean(),
      preparation,
      new Mill(),
      new ShareBrewTextFields(),
      translate,
      'en',
    );
    expect(withoutDose).toContain('TDS: 1.2 %');
    expect(withoutDose).not.toContain('EY:');
    expect(withoutDose).not.toContain('- - - - - - -');
  });
});
