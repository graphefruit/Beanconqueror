import {
  fakeAsync,
  flushMicrotasks,
  TestBed,
  tick,
} from '@angular/core/testing';

import { Platform } from '@ionic/angular';

import { QueueStrategy } from '@capacitor-community/text-to-speech';
import { StateChangeListener } from '@capacitor/screen-reader';
import { Subject } from 'rxjs';

import { Settings } from '../../../classes/settings/settings';
import { Announcer } from '../../a11y/announcer.service';
import {
  SCREEN_READER,
  ScreenReaderSource,
} from '../../a11y/screen-reader-state.service';
import { UILog } from '../../uiLog';
import { UISettingsStorage } from '../../uiSettingsStorage';
import {
  NATIVE_SPEECH,
  NativeSpeech,
  SCREEN_READER_HOLD_MS,
  TextToSpeechService,
} from '../text-to-speech.service';

describe('TextToSpeechService', () => {
  let stateChange: StateChangeListener | undefined;
  let screenReader: jasmine.SpyObj<ScreenReaderSource>;
  let native: jasmine.SpyObj<NativeSpeech>;
  let announcer: jasmine.SpyObj<Announcer>;
  let uiLog: jasmine.SpyObj<UILog>;
  let speakSynthesis: jasmine.Spy;
  let cancelSynthesis: jasmine.Spy;
  let settings: Settings;

  interface Setup {
    screenReaderOn?: boolean;
    platform?: string;
    /** Whether the app runs natively, with the speech plugin. */
    nativeApp?: boolean;
    languageSupported?: () => Promise<{ supported: boolean }>;
    nativeSpeak?: () => Promise<void>;
  }

  function create({
    screenReaderOn = false,
    platform = 'ios',
    nativeApp = true,
    languageSupported = () => Promise.resolve({ supported: true }),
    nativeSpeak = () => Promise.resolve(),
  }: Setup = {}): TextToSpeechService {
    stateChange = undefined;
    screenReader = jasmine.createSpyObj<ScreenReaderSource>('ScreenReader', [
      'speak',
      'isEnabled',
      'addListener',
    ]);
    screenReader.isEnabled.and.resolveTo({ value: screenReaderOn });
    screenReader.speak.and.resolveTo();
    screenReader.addListener.and.callFake(
      (_event: string, listener: StateChangeListener) => {
        stateChange = listener;
        return Promise.resolve({ remove: () => Promise.resolve() });
      },
    );
    native = jasmine.createSpyObj<NativeSpeech>('TextToSpeech', [
      'speak',
      'stop',
      'isLanguageSupported',
    ]);
    native.speak.and.callFake(nativeSpeak);
    native.stop.and.resolveTo();
    native.isLanguageSupported.and.callFake(languageSupported);
    announcer = jasmine.createSpyObj<Announcer>('Announcer', ['announce']);
    uiLog = jasmine.createSpyObj<UILog>('UILog', ['warn']);
    settings = new Settings();
    settings.text_to_speech_rate = 1.5;
    settings.text_to_speech_pitch = 1.5;
    settings.language = 'de';
    spyOn(UISettingsStorage, 'getInstance').and.returnValue({
      getSettings: () => settings,
    } as UISettingsStorage);
    speakSynthesis = spyOn(window.speechSynthesis, 'speak');
    cancelSynthesis = spyOn(window.speechSynthesis, 'cancel');
    TestBed.configureTestingModule({
      providers: [
        { provide: SCREEN_READER, useValue: screenReader },
        { provide: NATIVE_SPEECH, useValue: nativeApp ? native : null },
        { provide: Announcer, useValue: announcer },
        { provide: UILog, useValue: uiLog },
        {
          provide: Platform,
          useValue: {
            is: (name: string) => name === platform,
            resume: new Subject<void>(),
          },
        },
      ],
    });
    const service = TestBed.inject(TextToSpeechService);
    flushMicrotasks();
    return service;
  }

  function spokenNatively(): string[] {
    return native.speak.calls.allArgs().map(([options]) => options.text);
  }

  function spokenBySynthesis(): SpeechSynthesisUtterance[] {
    return speakSynthesis.calls
      .allArgs()
      .map(([utterance]) => utterance as SpeechSynthesisUtterance);
  }

  describe('while no screen reader is on', () => {
    it('speaks natively on iOS in the app language, as loud and fast as before', fakeAsync(() => {
      const service = create();

      service.speak('18.5');
      flushMicrotasks();

      expect(native.speak).toHaveBeenCalledOnceWith({
        text: '18.5',
        lang: 'de',
        rate: 3.5,
        pitch: 1.5,
        queueStrategy: QueueStrategy.Flush,
      });
      expect(native.isLanguageSupported).toHaveBeenCalledOnceWith({
        lang: 'de',
      });
      expect(speakSynthesis).not.toHaveBeenCalled();
      expect(screenReader.speak).not.toHaveBeenCalled();
    }));

    it('speaks natively on Android with the rate and pitch of the settings', fakeAsync(() => {
      const service = create({ platform: 'android' });
      settings.language = 'zh_TW';
      settings.text_to_speech_pitch = 3;

      service.speak('18.5');
      flushMicrotasks();

      expect(native.speak).toHaveBeenCalledOnceWith({
        text: '18.5',
        lang: 'zh-TW',
        rate: 1.5,
        pitch: 2,
        queueStrategy: QueueStrategy.Flush,
      });
      expect(announcer.announce.calls.count()).toBe(0);
    }));

    it('asks for the voice of the app language once it is there', fakeAsync(() => {
      const service = create();

      service.speak('1');
      flushMicrotasks();
      service.speak('2');
      flushMicrotasks();

      expect(native.isLanguageSupported).toHaveBeenCalledTimes(1);
      expect(spokenNatively()).toEqual(['1', '2']);
    }));

    it('speaks in the system language when the app language has no voice', fakeAsync(() => {
      const service = create({
        languageSupported: () => Promise.resolve({ supported: false }),
      });

      service.speak('18.5');
      flushMicrotasks();

      expect(native.speak.calls.mostRecent().args[0].lang).toBe(
        navigator.language,
      );
    }));

    it('speaks in the system language when the voices cannot be read', fakeAsync(() => {
      const service = create({
        languageSupported: () => Promise.reject(new Error('Not ready')),
      });

      service.speak('18.5');
      flushMicrotasks();

      expect(native.speak.calls.mostRecent().args[0].lang).toBe(
        navigator.language,
      );
    }));

    it('stays silent and logs once when the plugin cannot speak', fakeAsync(() => {
      const failure = new Error('This language is not supported.');
      const service = create({ nativeSpeak: () => Promise.reject(failure) });

      expect(() => {
        service.speak('1');
        service.speak('2');
      }).not.toThrow();
      flushMicrotasks();

      expect(native.speak).toHaveBeenCalledTimes(2);
      expect(uiLog.warn.calls.allArgs()).toEqual([
        ['Text to speech failed', failure],
      ]);
    }));

    it('stops through the plugin and drops a value still waiting', fakeAsync(() => {
      const service = create();

      service.speak('18.5');
      service.end();
      flushMicrotasks();

      expect(native.stop).toHaveBeenCalledTimes(1);
      expect(native.speak).not.toHaveBeenCalled();
    }));

    it('stops what is spoken before an end announcement', fakeAsync(() => {
      const service = create();

      service.speak('Brew end', true);
      flushMicrotasks();

      expect(native.stop).toHaveBeenCalledTimes(1);
      expect(spokenNatively()).toEqual(['Brew end']);
    }));

    it('stays silent when stopping fails', fakeAsync(() => {
      const service = create();
      native.stop.and.rejectWith(new Error('Not yet initialized'));

      expect(() => service.end()).not.toThrow();
      flushMicrotasks();
    }));

    it('falls back to speech synthesis in the browser', fakeAsync(() => {
      const service = create({ nativeApp: false });

      service.speak('18.5');
      service.end();

      const [utterance] = spokenBySynthesis();
      expect(utterance.text).toBe('18.5');
      expect(utterance.rate).toBe(1.5);
      expect(utterance.pitch).toBe(1.5);
      expect(cancelSynthesis).toHaveBeenCalledTimes(1);
      expect(native.speak).not.toHaveBeenCalled();
    }));
  });

  it('lets VoiceOver speak while it is on, in its own voice and rate', fakeAsync(() => {
    const service = create({ screenReaderOn: true });

    service.speak('18.5');
    service.speak('Brew end', true);
    flushMicrotasks();

    expect(screenReader.speak.calls.allArgs()).toEqual([
      [{ value: '18.5' }],
      [{ value: 'Brew end' }],
    ]);
    expect(native.speak).not.toHaveBeenCalled();
    expect(announcer.announce.calls.count()).toBe(0);
  }));

  it('lets TalkBack read the values from the live region, the latest first', fakeAsync(() => {
    const service = create({ screenReaderOn: true, platform: 'android' });

    service.speak('18.5');
    flushMicrotasks();

    expect(announcer.announce.calls.allArgs()).toEqual([['18.5', 'assertive']]);
    expect(screenReader.speak).not.toHaveBeenCalled();
    expect(native.speak).not.toHaveBeenCalled();
  }));

  for (const platform of ['ios', 'android']) {
    it(`lets the screen reader finish the time before the next weight on ${platform}`, fakeAsync(() => {
      const service = create({ screenReaderOn: true, platform });
      const heard = () =>
        platform === 'ios'
          ? screenReader.speak.calls.allArgs().map(([{ value }]) => value)
          : announcer.announce.calls.allArgs().map(([text]) => text);

      service.speakInFull('Time 83');
      service.speak('18.5');
      tick(SCREEN_READER_HOLD_MS - 1);
      service.speak('18.6');
      tick(1);
      service.speak('18.7');
      flushMicrotasks();

      expect(heard()).toEqual(['Time 83', '18.7']);
    }));
  }

  it('speaks the time with its own voice while no screen reader is on', fakeAsync(() => {
    const service = create();

    service.speakInFull('Time 83');
    service.speak('18.5');
    flushMicrotasks();

    expect(spokenNatively()).toEqual(['Time 83', '18.5']);
  }));

  it('stays silent when VoiceOver cannot speak', fakeAsync(() => {
    const service = create({ screenReaderOn: true });
    screenReader.speak.and.rejectWith(new Error('No value provided'));

    expect(() => service.speak('18.5')).not.toThrow();
    flushMicrotasks();

    expect(screenReader.speak).toHaveBeenCalledTimes(1);
    expect(native.speak).not.toHaveBeenCalled();
  }));

  for (const platform of ['ios', 'android']) {
    it(`follows the screen reader being turned on and off during a brew on ${platform}`, fakeAsync(() => {
      const service = create({ platform });
      service.speak('10');
      flushMicrotasks();

      stateChange({ value: true });
      service.speak('11');
      stateChange({ value: false });
      service.speak('12');
      flushMicrotasks();

      expect(spokenNatively()).toEqual(['10', '12']);
      // What its own voice still had to say stops once the screen reader takes over.
      expect(native.stop).toHaveBeenCalledTimes(1);
      if (platform === 'ios') {
        expect(screenReader.speak.calls.allArgs()).toEqual([[{ value: '11' }]]);
      } else {
        expect(announcer.announce.calls.allArgs()).toEqual([
          ['11', 'assertive'],
        ]);
      }
    }));
  }

  it('says nothing where the app offers no speech, such as a desktop browser', fakeAsync(() => {
    const service = create({ platform: 'desktop', nativeApp: false });

    service.speak('18.5');
    service.speakInFull('Time 83');
    service.end();
    flushMicrotasks();

    expect(service.available).toBeFalse();
    expect(speakSynthesis).not.toHaveBeenCalled();
    expect(cancelSynthesis).not.toHaveBeenCalled();
  }));
});
