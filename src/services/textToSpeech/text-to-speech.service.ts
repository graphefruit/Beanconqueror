import { inject, InjectionToken, Service } from '@angular/core';

import { Platform } from '@ionic/angular';

import {
  QueueStrategy,
  TextToSpeech,
  TextToSpeechPlugin,
} from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';

import { Settings } from '../../classes/settings/settings';
import {
  enqueueAnnouncement,
  QueuedAnnouncement,
} from '../a11y/announcement-queue';
import { Announcer } from '../a11y/announcer.service';
import {
  SCREEN_READER,
  ScreenReaderState,
} from '../a11y/screen-reader-state.service';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import {
  pluginSpeechPitch,
  pluginSpeechRate,
  speechLanguageTag,
} from './speech-options';

/**
 * How long an announcement that has to be heard in full (the brew time) holds
 * back the weight while a screen reader is on. A new announcement cuts off the
 * one still spoken; "Time 83" takes about a second at the default rate.
 */
export const SCREEN_READER_HOLD_MS = 1500;

/**
 * A screen reader does not tell when it has finished, so a value holds back
 * the next one for about as long as it takes to say: a new announcement would
 * cut it off, and a weight cut off every half second is never heard.
 */
export function screenReaderSpeakingMs(_text: string): number {
  return 500 + 70 * _text.length;
}

/**
 * How long the native voice may take for a value before the next one is said
 * anyway: the plugin may never say it is done, for example when the Android
 * engine restarts or a call interrupts iOS, and the voice would stay silent.
 */
export function nativeSpeakingLimitMs(_text: string, _rate: number): number {
  return 3000 + (100 * _text.length) / Math.min(1, _rate);
}

export type NativeSpeech = Pick<
  TextToSpeechPlugin,
  'speak' | 'stop' | 'isLanguageSupported'
>;

/**
 * The native speech plugin, or null in the browser, where speechSynthesis
 * speaks. Capacitor plugin proxies cannot be spied on; unit tests replace it.
 */
export const NATIVE_SPEECH = new InjectionToken<NativeSpeech | null>(
  'NATIVE_SPEECH',
  {
    providedIn: 'root',
    factory: () => (Capacitor.isNativePlatform() ? TextToSpeech : null),
  },
);

/** Speaks brew values (weight, time, events) on iOS and Android. */
@Service()
export class TextToSpeechService {
  private readonly platform = inject(Platform);
  private readonly screenReader = inject(SCREEN_READER);
  private readonly screenReaderState = inject(ScreenReaderState);
  private readonly announcer = inject(Announcer);
  private readonly nativeSpeech = inject(NATIVE_SPEECH);
  private readonly uiLog = inject(UILog);
  private readonly settings: Settings =
    UISettingsStorage.getInstance().getSettings();
  private readonly ios = this.platform.is('ios');

  /** Whether the app offers spoken brew values on this platform. */
  public readonly available = this.ios || this.platform.is('android');

  private ownVoiceMaySpeak = false;
  private screenReaderHeldUntil = 0;
  /** Counts end() calls, so a value still waiting for its language stays silent. */
  private ended = 0;
  private supportedLanguage: string | undefined;
  private failureLogged = false;

  /** The value spoken last, so an unchanged weight is not repeated. */
  private lastSpoken: string | undefined;
  /** Whether the native voice is still saying a value. */
  private nativeBusy = false;
  /** Said next by the native voice, see enqueueAnnouncement. */
  private waiting: (QueuedAnnouncement & { text: string })[] = [];

  /**
   * Says a value that changes (the weight). Every value is said to its end:
   * values that come meanwhile are dropped except the newest, which follows,
   * so what is heard is current and never cut off. An unchanged value is not
   * said again. `_end` stops whatever is said and says this at once.
   */
  public speak(_text: string, _end = false) {
    if (!this.available) {
      return;
    }
    if (!_end && _text === this.lastSpoken) {
      return;
    }
    if (this.screenReaderState.on()) {
      if (_end || Date.now() >= this.screenReaderHeldUntil) {
        this.speakThroughScreenReader(
          _text,
          screenReaderSpeakingMs(_text),
          _end ? undefined : 'weight',
        );
      }
      return;
    }
    if (_end) {
      this.end();
    }
    this.say(_text, _end ? undefined : 'weight');
  }

  /**
   * Says the brew time like the weight, but heard in full before the next
   * weight: a time that is due while the last one is still said replaces it.
   */
  public speakTime(_text: string) {
    if (!this.available) {
      return;
    }
    if (this.screenReaderState.on()) {
      this.speakThroughScreenReader(
        _text,
        Math.max(SCREEN_READER_HOLD_MS, screenReaderSpeakingMs(_text)),
        'time',
      );
      return;
    }
    this.say(_text, 'time');
  }

  /** Says each text in full, in order, before the next changing value. */
  public speakInFull(..._texts: string[]) {
    if (!this.available || _texts.length === 0) {
      return;
    }
    if (this.screenReaderState.on()) {
      const text = _texts.join(', ');
      this.speakThroughScreenReader(
        text,
        Math.max(SCREEN_READER_HOLD_MS, screenReaderSpeakingMs(text)),
      );
      return;
    }
    _texts.forEach((text) => this.say(text));
  }

  /** Says `_text` in its own voice, after what is still said and waiting. */
  private say(_text: string, _key?: string) {
    this.ownVoiceMaySpeak = true;
    if (!this.nativeSpeech) {
      this.lastSpoken = _text;
      this.speakInBrowser(_text);
    } else if (this.nativeBusy) {
      this.waiting = enqueueAnnouncement(this.waiting, {
        text: _text,
        key: _key,
      });
    } else {
      void this.speakNatively(this.nativeSpeech, _text);
    }
  }

  public end() {
    if (!this.available) {
      return;
    }
    this.ended++;
    this.ownVoiceMaySpeak = false;
    this.nativeBusy = false;
    this.waiting = [];
    this.lastSpoken = undefined;
    try {
      if (this.nativeSpeech) {
        this.nativeSpeech.stop().catch(() => undefined);
      } else {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Nothing to stop.
    }
  }

  /**
   * While a screen reader is on, it speaks the value in its own voice and rate,
   * and a new value cuts off the one still spoken, so the weight heard is the
   * current one; a second voice would talk over it. VoiceOver takes the value
   * from the screen reader plugin. On Android that plugin starts a new speech
   * engine for every call, so TalkBack reads it from the app's live region
   * instead, assertive so the latest value wins. A failed announcement is
   * skipped: the next follows within a second.
   */
  private speakThroughScreenReader(
    _text: string,
    _holdMs: number,
    _key?: string,
  ) {
    if (this.ownVoiceMaySpeak) {
      this.end();
    }
    this.lastSpoken = _text;
    this.screenReaderHeldUntil = Date.now() + _holdMs;
    if (this.ios) {
      this.screenReader?.speak({ value: _text }).catch(() => undefined);
    } else {
      // The announcer drops the same text within REPEAT_WINDOW_MS: an unchanged
      // weight is heard every two seconds instead of interrupting TalkBack.
      this.announcer.announce(_text, 'assertive', _key);
    }
  }

  /**
   * Says one value and then the next one waiting. The plugin resolves when
   * the value has been said.
   */
  private async speakNatively(speech: NativeSpeech, _text: string) {
    const ended = this.ended;
    this.nativeBusy = true;
    this.lastSpoken = _text;
    let limit: ReturnType<typeof setTimeout> | undefined;
    try {
      const lang = await this.language(speech);
      if (ended !== this.ended) {
        return;
      }
      const rate = pluginSpeechRate(
        this.settings.text_to_speech_rate,
        this.ios,
      );
      await Promise.race([
        speech.speak({
          text: _text,
          lang,
          rate,
          pitch: pluginSpeechPitch(this.settings.text_to_speech_pitch),
          queueStrategy: QueueStrategy.Flush,
        }),
        new Promise<never>((_resolve, reject) => {
          limit = setTimeout(
            () => reject(new Error('Text to speech did not finish')),
            nativeSpeakingLimitMs(_text, rate),
          );
        }),
      ]);
    } catch (error) {
      // Once is enough: the same failure would repeat for every value.
      if (!this.failureLogged) {
        this.failureLogged = true;
        this.uiLog.warn('Text to speech failed', error);
      }
    } finally {
      clearTimeout(limit);
    }
    if (ended !== this.ended) {
      return;
    }
    this.nativeBusy = false;
    let next = this.waiting.shift();
    // A weight that came back to the value just said is not repeated.
    while (next?.key === 'weight' && next.text === this.lastSpoken) {
      next = this.waiting.shift();
    }
    if (next !== undefined) {
      void this.speakNatively(speech, next.text);
    }
  }

  /**
   * The app language if there is a voice for it, otherwise the system language.
   * Asked again with the next value until there is one, as the Android engine
   * may still be starting.
   */
  private async language(speech: NativeSpeech): Promise<string> {
    const appLanguage = speechLanguageTag(this.settings.language);
    if (this.supportedLanguage === appLanguage) {
      return appLanguage;
    }
    try {
      if ((await speech.isLanguageSupported({ lang: appLanguage })).supported) {
        this.supportedLanguage = appLanguage;
        return appLanguage;
      }
    } catch {
      // Treated as no voice.
    }
    return navigator.language;
  }

  private speakInBrowser(_text: string) {
    try {
      const utterance = new SpeechSynthesisUtterance(_text);
      utterance.rate = this.settings.text_to_speech_rate;
      utterance.pitch = this.settings.text_to_speech_pitch;
      window.speechSynthesis.speak(utterance);
    } catch {
      // No speech synthesis in this browser.
    }
  }
}
