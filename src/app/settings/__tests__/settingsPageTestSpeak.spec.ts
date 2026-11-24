import { fakeAsync, tick } from '@angular/core/testing';

import { TextToSpeechService } from '../../../services/textToSpeech/text-to-speech.service';
import { SettingsPage } from '../settings.page';

describe('SettingsPage test of the voice', () => {
  it('says every test number in full and in order', fakeAsync(() => {
    const textToSpeech = jasmine.createSpyObj<TextToSpeechService>(
      'TextToSpeechService',
      ['speak', 'speakInFull'],
    );
    const page = Object.assign(Object.create(SettingsPage.prototype), {
      textToSpeech,
    }) as SettingsPage;

    page.testSpeak();
    tick(10000);

    expect(textToSpeech.speakInFull.calls.allArgs()).toEqual([
      ['182.5', '28', '1072', '1.2', '0.1', '203.5'],
    ]);
    expect(textToSpeech.speak.calls.count()).toBe(0);
  }));
});
