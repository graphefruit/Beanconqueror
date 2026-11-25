import { TranslateService } from '@ngx-translate/core';

import { Settings } from '../../../../classes/settings/settings';
import { BrewBrewingComponent } from '../brew-brewing.component';

describe('BrewBrewingComponent weight taken from the scale', () => {
  function brewing(language: string, weight: number) {
    const speech = jasmine.createSpyObj<{
      speak: (text: string, force: boolean) => void;
    }>('TextToSpeechService', ['speak']);
    const component = Object.assign(
      Object.create(BrewBrewingComponent.prototype),
      {
        textToSpeech: speech,
        settings: { text_to_speech_active: true, language } as Settings,
        data: {},
        translate: { instant: (key: string) => key } as TranslateService,
        getActualBluetoothWeight: () => weight,
        checkChanges: () => undefined,
      },
    ) as BrewBrewingComponent;
    const said = () => speech.speak.calls.allArgs().map(([text]) => text);
    return { component, said };
  }

  it('says the grind weight with tenths and the decimal comma of German', () => {
    const { component, said } = brewing('de', 18.27);

    component.bluetoothScaleSetGrindWeight();

    expect(said()).toEqual(['BREW_FLOW_WEIGHT 18,3']);
  });

  it('says the bean weight with a decimal point in English', () => {
    const { component, said } = brewing('en', 18.3);

    component.bluetoothScaleSetBeanWeightIn();

    expect(said()).toEqual(['BREW_FLOW_WEIGHT 18.3']);
  });
});
