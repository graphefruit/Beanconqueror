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
  takeNextAnnouncement,
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

/** The least a screen reader gets for a value, e.g. "Time 5.25". */
export const SCREEN_READER_MIN_SPEAKING_MS = 1200;

/**
 * How long a screen reader is given for `_text` before the next value. It
 * does not tell when it has finished, and a new announcement cuts off the one
 * still spoken, so this is a generous estimate per character at the default
 * rate. Values due more often than this are said as often as it allows.
 */
export function screenReaderSpeakingMs(_text: string): number {
  return Math.max(SCREEN_READER_MIN_SPEAKING_MS, 500 + 100 * _text.length);
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

type WaitingText = QueuedAnnouncement & { readonly text: string };

/**
 * Speaks brew values (weight, time, events) on iOS and Android. Everything
 * goes through one channel: a value is said to its end before the next, of
 * each kind only the newest waits, and the weight and the time take turns
 * when both are due, so neither is cut off or left out however short their
 * intervals are.
 */
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
  /** Counts end() calls, so what was still said or waited stays silent. */
  private ended = 0;
  private supportedLanguage: string | undefined;
  private failureLogged = false;

  /** Whether a text is still being said. */
  private busy = false;
  private waiting: WaitingText[] = [];
  /** The key of the value said last, see takeNextAnnouncement. */
  private lastKey: string | undefined;
  /** The text said last of each key, so an unchanged value is not repeated. */
  private lastSaid = new Map<string, string>();

  /**
   * Says a value that changes (the weight). An unchanged value is not said
   * again. `_end` stops whatever is said or waits and says this at once.
   */
  public speak(_text: string, _end = false) {
    if (!this.available) {
      return;
    }
    if (_end) {
      this.end();
      this.enqueue(_text);
    } else {
      this.enqueue(_text, 'weight');
    }
  }

  /** Says the brew time, like the weight and taking turns with it. */
  public speakTime(_text: string) {
    if (this.available) {
      this.enqueue(_text, 'time');
    }
  }

  /** Says each text in full, in order, before the next changing value. */
  public speakInFull(..._texts: string[]) {
    if (!this.available || _texts.length === 0) {
      return;
    }
    // A screen reader says them as one, so the list is not spaced out.
    const texts = this.screenReaderState.on() ? [_texts.join(', ')] : _texts;
    texts.forEach((text) => this.enqueue(text));
  }

  public end() {
    if (!this.available) {
      return;
    }
    this.ended++;
    this.busy = false;
    this.waiting = [];
    this.lastKey = undefined;
    this.lastSaid.clear();
    this.stopOwnVoice();
  }

  private enqueue(_text: string, _key?: string) {
    if (_key !== undefined && this.lastSaid.get(_key) === _text) {
      // Back to the value said last: one still waiting is out of date.
      this.waiting = this.waiting.filter(({ key }) => key !== _key);
      return;
    }
    this.waiting = enqueueAnnouncement(this.waiting, {
      text: _text,
      key: _key,
    });
    this.sayNext();
  }

  private sayNext() {
    const next = this.busy
      ? undefined
      : takeNextAnnouncement(this.waiting, this.lastKey);
    if (next === undefined) {
      return;
    }
    const [{ text, key }, rest] = next;
    this.waiting = rest;
    this.busy = true;
    this.lastKey = key;
    if (key !== undefined) {
      this.lastSaid.set(key, text);
    }
    const ended = this.ended;
    void this.say(text, key).then(() => {
      if (ended === this.ended) {
        this.busy = false;
        this.sayNext();
      }
    });
  }

  /** Says `_text` and resolves once it has been said. */
  private say(_text: string, _key: string | undefined): Promise<void> {
    if (this.screenReaderState.on()) {
      return this.sayThroughScreenReader(_text, _key);
    }
    this.ownVoiceMaySpeak = true;
    if (this.nativeSpeech) {
      return this.speakNatively(this.nativeSpeech, _text);
    }
    this.speakInBrowser(_text);
    return Promise.resolve();
  }

  /**
   * While a screen reader is on, it speaks the value in its own voice and
   * rate; a second voice would talk over it. VoiceOver takes the value from
   * the screen reader plugin. On Android that plugin starts a new speech
   * engine for every call, so TalkBack reads it from the app's live region
   * instead, assertive so it is not held back behind what TalkBack reads
   * otherwise. Either cuts off what it is saying, so the next value waits
   * screenReaderSpeakingMs. A failed announcement is skipped.
   */
  private sayThroughScreenReader(
    _text: string,
    _key: string | undefined,
  ): Promise<void> {
    if (this.ownVoiceMaySpeak) {
      this.stopOwnVoice();
    }
    if (this.ios) {
      this.screenReader?.speak({ value: _text }).catch(() => undefined);
    } else {
      this.announcer.announce(_text, 'assertive', _key);
    }
    return new Promise((done) =>
      setTimeout(done, screenReaderSpeakingMs(_text)),
    );
  }

  private stopOwnVoice() {
    this.ownVoiceMaySpeak = false;
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

  /** Says one value; the plugin resolves when it has been said. */
  private async speakNatively(speech: NativeSpeech, _text: string) {
    const ended = this.ended;
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
