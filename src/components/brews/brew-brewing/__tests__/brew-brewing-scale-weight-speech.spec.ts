import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { Settings } from '../../../../classes/settings/settings';
import { Announcer } from '../../../../services/a11y/announcer.service';
import {
  SCREEN_READER,
  ScreenReaderSource,
} from '../../../../services/a11y/screen-reader-state.service';
import {
  NATIVE_SPEECH,
  NativeSpeech,
  TextToSpeechService,
} from '../../../../services/textToSpeech/text-to-speech.service';
import { UILog } from '../../../../services/uiLog';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { BrewBrewingComponent } from '../brew-brewing.component';

describe('BrewBrewingComponent weight taken from the scale', () => {
  function component(
    language: string,
    weight: number,
    textToSpeech: Pick<TextToSpeechService, 'speakInFull'>,
    wholeGrams = false,
  ) {
    return Object.assign(Object.create(BrewBrewingComponent.prototype), {
      textToSpeech,
      settings: {
        text_to_speech_active: true,
        text_to_speech_whole_grams: wholeGrams,
        language,
      } as Settings,
      data: {},
      translate: { instant: (key: string) => key } as TranslateService,
      getActualBluetoothWeight: () => weight,
      checkChanges: () => undefined,
    }) as BrewBrewingComponent;
  }

  function brewing(language: string, weight: number, wholeGrams = false) {
    const speech = jasmine.createSpyObj<
      Pick<TextToSpeechService, 'speakInFull'>
    >('TextToSpeechService', ['speakInFull']);
    const said = () => speech.speakInFull.calls.allArgs().map(([text]) => text);
    return {
      component: component(language, weight, speech, wholeGrams),
      said,
    };
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

  it('says whole grams when they are chosen', () => {
    const { component, said } = brewing('de', 18.27, true);

    component.bluetoothScaleSetGrindWeight();

    expect(said()).toEqual(['BREW_FLOW_WEIGHT 18']);
  });

  it('says the taken weight after the live weight still said, without stopping the voice', fakeAsync(() => {
    const native = jasmine.createSpyObj<NativeSpeech>('TextToSpeech', [
      'speak',
      'stop',
      'isLanguageSupported',
    ]);
    native.speak.and.callFake(
      () => new Promise<void>((done) => setTimeout(done, 1000)),
    );
    native.stop.and.resolveTo();
    native.isLanguageSupported.and.resolveTo({ supported: true });
    const screenReader = jasmine.createSpyObj<ScreenReaderSource>(
      'ScreenReader',
      ['speak', 'isEnabled', 'addListener'],
    );
    screenReader.isEnabled.and.resolveTo({ value: false });
    screenReader.addListener.and.resolveTo({
      remove: () => Promise.resolve(),
    });
    spyOn(UISettingsStorage, 'getInstance').and.returnValue({
      getSettings: () => new Settings(),
    } as UISettingsStorage);
    TestBed.configureTestingModule({
      providers: [
        { provide: NATIVE_SPEECH, useValue: native },
        { provide: SCREEN_READER, useValue: screenReader },
        { provide: Announcer, useValue: { announce: () => true } },
        { provide: UILog, useValue: { warn: () => undefined } },
        {
          provide: Platform,
          useValue: {
            is: (name: string) => name === 'android',
            resume: new Subject<void>(),
          },
        },
      ],
    });
    const speech = TestBed.inject(TextToSpeechService);
    tick();

    // The live weight before the brew is still said when the button is pressed.
    speech.speak('18,3');
    tick(200);
    component('de', 18.27, speech).bluetoothScaleSetGrindWeight();
    speech.speak('18,3');
    tick(3000);

    expect(native.stop).not.toHaveBeenCalled();
    expect(native.speak.calls.allArgs().map(([o]) => o.text)).toEqual([
      '18,3',
      'BREW_FLOW_WEIGHT 18,3',
    ]);
  }));
});
