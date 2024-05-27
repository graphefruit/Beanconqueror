import { Injectable } from '@angular/core';
import { UISettingsStorage } from '../uiSettingsStorage';
import { Settings } from '../../classes/settings/settings';
import { Platform } from '@ionic/angular';

declare var TTS;
declare var window;
@Injectable({
  providedIn: 'root',
})
export class TextToSpeechService {
  private settings: Settings;

  private rate: number = 1;
  private pitch: number = 1;
  private textToSpeechInstance: SpeechSynthesis;
  private selectedVoice;

  private ttsEnabled = false;

  constructor(private readonly platform: Platform) {
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
    try {
      this.selectedVoice.text = _text;
      if (_end) {
        this.end();
      }
      this.textToSpeechInstance.speak(this.selectedVoice);
    } catch (ex) {}
  }
  public end() {
    if (this.ttsEnabled === false) {
      return;
    }
    this.textToSpeechInstance.cancel();
  }
}
