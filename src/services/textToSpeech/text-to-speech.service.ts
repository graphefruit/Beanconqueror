import { inject, InjectionToken, Service } from '@angular/core';

import { Platform } from '@ionic/angular';

import {
  QueueStrategy,
  TextToSpeech,
  TextToSpeechPlugin,
} from '@capacitor-community/text-to-speech';
import { Capacitor } from '@capacitor/core';

import { Settings } from '../../classes/settings/settings';
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

  public speak(_text: string, _end = false) {
    if (!this.available) {
      return;
    }
    if (this.screenReaderState.on()) {
      if (Date.now() >= this.screenReaderHeldUntil) {
        this.speakThroughScreenReader(_text);
      }
      return;
    }
    if (_end) {
      this.end();
    }
    this.ownVoiceMaySpeak = true;
    if (this.nativeSpeech) {
      void this.speakNatively(this.nativeSpeech, _text);
    } else {
      this.speakInBrowser(_text);
    }
  }

  /** Like speak, but a screen reader gets to finish it before the next value. */
  public speakInFull(_text: string) {
    this.speak(_text);
    if (this.available && this.screenReaderState.on()) {
      this.screenReaderHeldUntil = Date.now() + SCREEN_READER_HOLD_MS;
    }
  }

  public end() {
    if (!this.available) {
      return;
    }
    this.ended++;
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

  /**
   * While a screen reader is on, it speaks the value in its own voice and rate,
   * and a new value cuts off the one still spoken, so the weight heard is the
   * current one; a second voice would talk over it. VoiceOver takes the value
   * from the screen reader plugin. On Android that plugin starts a new speech
   * engine for every call, so TalkBack reads it from the app's live region
   * instead, assertive so the latest value wins. A failed announcement is
   * skipped: the next follows within a second.
   */
  private speakThroughScreenReader(_text: string) {
    if (this.ownVoiceMaySpeak) {
      this.end();
    }
    if (this.ios) {
      this.screenReader?.speak({ value: _text }).catch(() => undefined);
    } else {
      // The announcer drops the same text within REPEAT_WINDOW_MS: an unchanged
      // weight is heard every two seconds instead of interrupting TalkBack.
      this.announcer.announce(_text, 'assertive');
    }
  }

  private async speakNatively(speech: NativeSpeech, _text: string) {
    const ended = this.ended;
    try {
      const lang = await this.language(speech);
      if (ended !== this.ended) {
        return;
      }
      await speech.speak({
        text: _text,
        lang,
        rate: pluginSpeechRate(this.settings.text_to_speech_rate, this.ios),
        pitch: pluginSpeechPitch(this.settings.text_to_speech_pitch),
        queueStrategy: QueueStrategy.Flush,
      });
    } catch (error) {
      // Once is enough: the same failure would repeat for every value.
      if (!this.failureLogged) {
        this.failureLogged = true;
        this.uiLog.warn('Text to speech failed', error);
      }
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
