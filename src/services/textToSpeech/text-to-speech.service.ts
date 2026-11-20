import { inject, Service } from '@angular/core';

import { Platform } from '@ionic/angular';

import { Settings } from '../../classes/settings/settings';
import {
  SCREEN_READER,
  ScreenReaderState,
} from '../a11y/screen-reader-state.service';
import { UISettingsStorage } from '../uiSettingsStorage';

declare var TTS;
declare var window;
@Service()
export class TextToSpeechService {
  private readonly platform = inject(Platform);
  private readonly screenReader = inject(SCREEN_READER);
  private readonly screenReaderState = inject(ScreenReaderState);

  private settings: Settings;

  private rate: number = 1;
  private pitch: number = 1;
  private textToSpeechInstance: SpeechSynthesis;
  private selectedVoice;

  private ttsEnabled = false;

  constructor() {
    this.settings = UISettingsStorage.getInstance().getSettings();
    if (this.platform.is('ios')) {
      this.ttsEnabled = true;
      this.textToSpeechInstance = window.speechSynthesis;
      this.selectedVoice = new SpeechSynthesisUtterance();
    }
  }

  public readAndSetTTLSettings() {
    if (this.ttsEnabled === false) {
      return;
    }
    this.selectedVoice.rate = this.settings.text_to_speech_rate;
    this.selectedVoice.pitch = this.settings.text_to_speech_pitch;
    this.selectedVoice.volume = 1;
  }

  public speak(_text: string, _end: boolean = false) {
    if (this.ttsEnabled === false) {
      return;
    }
    if (this.screenReaderState.on()) {
      this.speakThroughVoiceOver(_text);
      return;
    }
    try {
      this.selectedVoice.text = _text;
      if (_end) {
        this.end();
      }
      this.textToSpeechInstance.speak(this.selectedVoice);
    } catch (ex) {}
  }

  /**
   * A VoiceOver announcement uses the voice and rate the user set in VoiceOver,
   * and a new one replaces the one still being spoken, so the weight heard is
   * the current one. Speech synthesis would talk over VoiceOver. A failed
   * announcement is skipped: the next value follows within a second.
   */
  private speakThroughVoiceOver(_text: string) {
    if (
      this.textToSpeechInstance.speaking ||
      this.textToSpeechInstance.pending
    ) {
      this.textToSpeechInstance.cancel();
    }
    this.screenReader?.speak({ value: _text }).catch(() => undefined);
  }

  public end() {
    if (this.ttsEnabled === false) {
      return;
    }
    this.textToSpeechInstance.cancel();
  }
}
