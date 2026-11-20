import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular';

import { StateChangeListener } from '@capacitor/screen-reader';

import { Settings } from '../../../classes/settings/settings';
import {
  SCREEN_READER,
  ScreenReaderSource,
} from '../../a11y/screen-reader-state.service';
import { UISettingsStorage } from '../../uiSettingsStorage';
import { TextToSpeechService } from '../text-to-speech.service';

describe('TextToSpeechService', () => {
  let stateChange: StateChangeListener | undefined;
  let plugin: jasmine.SpyObj<ScreenReaderSource>;
  let speakSynthesis: jasmine.Spy;
  let cancelSynthesis: jasmine.Spy;
  let settings: Settings;

  function create(
    voiceOver: boolean,
    platform = 'ios',
    speak: () => Promise<void> = () => Promise.resolve(),
  ): TextToSpeechService {
    stateChange = undefined;
    plugin = jasmine.createSpyObj<ScreenReaderSource>('ScreenReader', [
      'speak',
      'isEnabled',
      'addListener',
    ]);
    plugin.isEnabled.and.resolveTo({ value: voiceOver });
    plugin.speak.and.callFake(speak);
    plugin.addListener.and.callFake(
      (_event: string, listener: StateChangeListener) => {
        stateChange = listener;
        return Promise.resolve({ remove: () => Promise.resolve() });
      },
    );
    settings = new Settings();
    settings.text_to_speech_rate = 2.5;
    settings.text_to_speech_pitch = 1.5;
    spyOn(UISettingsStorage, 'getInstance').and.returnValue({
      getSettings: () => settings,
    } as UISettingsStorage);
    speakSynthesis = spyOn(window.speechSynthesis, 'speak');
    cancelSynthesis = spyOn(window.speechSynthesis, 'cancel');
    TestBed.configureTestingModule({
      providers: [
        { provide: SCREEN_READER, useValue: plugin },
        {
          provide: Platform,
          useValue: { is: (name: string) => name === platform },
        },
      ],
    });
    const service = TestBed.inject(TextToSpeechService);
    service.readAndSetTTLSettings();
    flushMicrotasks();
    return service;
  }

  function spokenBySynthesis(): SpeechSynthesisUtterance[] {
    return speakSynthesis.calls
      .allArgs()
      .map(([utterance]) => utterance as SpeechSynthesisUtterance);
  }

  it('speaks with its own voice, rate and pitch while VoiceOver is off', fakeAsync(() => {
    const service = create(false);

    service.speak('18.5');

    expect(plugin.speak).not.toHaveBeenCalled();
    const [utterance] = spokenBySynthesis();
    expect(utterance.text).toBe('18.5');
    expect(utterance.rate).toBe(2.5);
    expect(utterance.pitch).toBe(1.5);
  }));

  it('lets VoiceOver speak while it is on, in its own voice and rate', fakeAsync(() => {
    const service = create(true);

    service.speak('18.5');
    service.speak('Brew end', true);
    flushMicrotasks();

    expect(plugin.speak.calls.allArgs()).toEqual([
      [{ value: '18.5' }],
      [{ value: 'Brew end' }],
    ]);
    expect(speakSynthesis).not.toHaveBeenCalled();
  }));

  it('stays silent when VoiceOver cannot speak', fakeAsync(() => {
    const service = create(true, 'ios', () =>
      Promise.reject(new Error('No value provided')),
    );

    expect(() => service.speak('18.5')).not.toThrow();
    flushMicrotasks();

    expect(plugin.speak).toHaveBeenCalledTimes(1);
    expect(speakSynthesis).not.toHaveBeenCalled();
  }));

  it('follows VoiceOver being turned on and off during a brew', fakeAsync(() => {
    const service = create(false);
    service.speak('10');

    stateChange({ value: true });
    service.speak('11');
    stateChange({ value: false });
    service.speak('12');
    flushMicrotasks();

    expect(plugin.speak.calls.allArgs()).toEqual([[{ value: '11' }]]);
    expect(spokenBySynthesis().length).toBe(2);
  }));

  it('stops what its own voice still has to say once VoiceOver takes over', fakeAsync(() => {
    const service = create(false);
    service.speak('10');
    spyOnProperty(SpeechSynthesis.prototype, 'pending').and.returnValue(true);

    stateChange({ value: true });
    service.speak('11');

    expect(cancelSynthesis).toHaveBeenCalledTimes(1);
  }));

  it('says nothing on Android, not even through the screen reader', fakeAsync(() => {
    const service = create(true, 'android');

    service.speak('18.5');
    service.end();

    expect(plugin.speak).not.toHaveBeenCalled();
    expect(speakSynthesis).not.toHaveBeenCalled();
    expect(cancelSynthesis).not.toHaveBeenCalled();
  }));
});
