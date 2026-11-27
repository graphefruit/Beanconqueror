import { TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular';

import { Subject } from 'rxjs';

import de from '../../assets/i18n/de.json';
import en from '../../assets/i18n/en.json';
import { FakeNfcPort } from '../../test-utils/fake-nfc-port';
import { IntentHandlerService } from '../intentHandler/intent-handler.service';
import { NFC_PORT } from '../ports/nfc-port';
import { UIAlert } from '../uiAlert';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UIToast } from '../uiToast';
import { NfcService } from './nfc-service.service';

interface NfcInternals {
  __handleNFCData(tag: unknown): void;
  __writeInternal(link: string): Promise<void>;
  listenToNFCAndroid(): void;
  writeNFCData(link: string): void;
  readNFCTag(): Promise<void>;
  isNFCEnabled(): boolean;
}

const SERIAL = [4, 87, 51, 2, 202, 96, 128];
const LINK = 'https://beanconqueror.com/?shareUserBean0=' + 'Q'.repeat(300);
const TAG_LINK = 'https://beanconqueror.com/app/nfc/#3E95E1/START_BREW';

function uriRecord(uri: string) {
  return {
    tnf: 1,
    type: [0x55],
    payload: [0, ...new TextEncoder().encode(uri)],
  };
}

describe('NfcService', () => {
  let service: NfcInternals;
  let nfc: FakeNfcPort;
  let log: jasmine.Spy;
  let handleDeepLink: jasmine.Spy;
  let showMessage: jasmine.Spy;

  beforeEach(() => {
    log = jasmine.createSpy('log');
    handleDeepLink = jasmine.createSpy('handleDeepLink');
    nfc = new FakeNfcPort();
    showMessage = jasmine.createSpy('showMessage');
    service = Object.assign(Object.create(NfcService.prototype), {
      nfc,
      uiLog: { log, error: jasmine.createSpy('error') },
      uiAlert: { showMessage },
      intentHandler: { handleDeepLink },
      platform: { is: () => false },
    }) as NfcInternals;
  });

  it('opens the link of a tag without logging the tag and its serial number', () => {
    service.__handleNFCData({ id: SERIAL, ndefMessage: [uriRecord(LINK)] });

    expect(handleDeepLink).toHaveBeenCalledOnceWith(LINK);
    expect(log.calls.allArgs()).toEqual([['We read NFC-Tag']]);
    expect(showMessage).not.toHaveBeenCalled();
  });

  for (const [name, tag] of [
    ['no tag', undefined],
    ['an empty tag', { id: SERIAL, ndefMessage: [] }],
    [
      'a foreign tag',
      { id: SERIAL, ndefMessage: [uriRecord('https://example.com')] },
    ],
  ] as const) {
    it(`tells the user when ${name} holds no app link`, () => {
      service.__handleNFCData(tag);

      expect(handleDeepLink).not.toHaveBeenCalled();
      expect(showMessage).toHaveBeenCalledOnceWith(
        'NFC.TAG_WITHOUT_APP_LINK_DESCRIPTION',
        'NFC.TAG_WITHOUT_APP_LINK_TITLE',
        'OK',
        true,
      );
    });
  }

  it('writes the link and keeps it out of the log', async () => {
    await service.__writeInternal(TAG_LINK);

    expect(nfc.written).toEqual([TAG_LINK]);
    expect(log.calls.allArgs()).toEqual([['NFC tag written']]);
  });

  for (const [name, written, key] of [
    ['success', true, 'NFC.WRITE_COMPLETED'],
    ['failure', false, 'NFC.WRITE_UNCOMPLETED'],
  ] as const) {
    it(`reports the ${name} of writing on Android`, async () => {
      service = Object.assign(service, {
        platform: { is: (os: string) => os === 'android' },
      });
      nfc.writeError = written ? undefined : 'Tag is read only';

      await service.__writeInternal(TAG_LINK);

      expect(showMessage).toHaveBeenCalledOnceWith(
        `${key}_DESCRIPTION`,
        `${key}_TITLE`,
        'OK',
        true,
      );
    });
  }

  it('reports nothing on iOS, where the system sheet tells the outcome', async () => {
    nfc.writeError = 'Tag is read only';

    await service.__writeInternal(TAG_LINK);

    expect(showMessage).not.toHaveBeenCalled();
  });

  for (const [language, texts] of [
    ['en', en],
    ['de', de],
  ] as const) {
    it(`titles a written tag differently from a failed one in ${language}`, () => {
      expect(texts.NFC.WRITE_COMPLETED_TITLE).not.toBe(
        texts.NFC.WRITE_UNCOMPLETED_TITLE,
      );
    });
  }

  it('keeps the link out of the log when writing fails', async () => {
    nfc.writeError = 'Tag is read only';

    await service.__writeInternal(TAG_LINK);

    expect(log.calls.allArgs()).toEqual([['NFC tag not written']]);
  });

  it('writes right away on iOS', () => {
    service.writeNFCData(TAG_LINK);

    expect(nfc.written).toEqual([TAG_LINK]);
  });

  it('writes on Android once a tag is held to the reader', () => {
    const tags = new Subject<unknown>();
    Object.assign(service, {
      platform: { is: (name: string) => name === 'android' },
      uiToast: { showInfoToastBottom: jasmine.createSpy('toast') },
      androidMessageSubject: tags,
    });

    service.writeNFCData(TAG_LINK);
    expect(nfc.written).toEqual([]);
    tags.next({ tag: {} });
    tags.next({ tag: {} });

    expect(nfc.written).toEqual([TAG_LINK]);
  });

  describe('tags the OS hands to the app', () => {
    const tag = { ndefMessage: [uriRecord(TAG_LINK)] };
    let tags: Subject<unknown>;
    let next: jasmine.Spy;

    beforeEach(() => {
      tags = new Subject<unknown>();
      next = spyOn(tags, 'next');
      Object.assign(service, { androidMessageSubject: tags });
      service.listenToNFCAndroid();
    });

    it('opens the link of a tag that started the app or reached it in the background', () => {
      nfc.present({ tag, opensApp: true });

      expect(handleDeepLink).toHaveBeenCalledOnceWith(TAG_LINK);
      expect(next).not.toHaveBeenCalled();
    });

    it('hands a tag held to the reader in the app to reading or writing', () => {
      nfc.present({ tag, opensApp: false });

      expect(next).toHaveBeenCalledOnceWith({ tag });
      expect(handleDeepLink).not.toHaveBeenCalled();
    });
  });

  describe('reading a tag', () => {
    let error: jasmine.Spy;
    let toast: jasmine.Spy;
    let tags: Subject<unknown>;

    beforeEach(() => {
      error = jasmine.createSpy('error');
      toast = jasmine.createSpy('toast');
      tags = new Subject<unknown>();
      Object.assign(service, {
        nfcEnabled: true,
        uiLog: { log, error },
        uiToast: { showInfoToastBottom: toast },
        androidMessageSubject: tags,
      });
    });

    it('explains how to turn NFC on when it is off', async () => {
      Object.assign(service, { nfcEnabled: false });

      await service.readNFCTag();

      expect(showMessage).toHaveBeenCalledOnceWith(
        'NFC.PLEASE_ENABLED_NFC_DESCRIPTION',
        'CARE',
        'OK',
        true,
      );
      expect(toast).not.toHaveBeenCalled();
    });

    it('asks on Android to hold a tag and opens the link of the next tag only', async () => {
      Object.assign(service, {
        platform: { is: (name: string) => name === 'android' },
      });

      await service.readNFCTag();
      expect(toast).toHaveBeenCalledOnceWith(
        'NFC.SCAN_IN_PROGRESS_PLEASE_HOLD_YOUR_TAG_TO_READER',
      );
      tags.next({ tag: { ndefMessage: [uriRecord(TAG_LINK)] } });
      tags.next({ tag: { ndefMessage: [uriRecord(TAG_LINK)] } });

      expect(handleDeepLink).toHaveBeenCalledOnceWith(TAG_LINK);
    });

    it('opens the link of the tag scanned on iOS', async () => {
      nfc.scanAnswer = {
        ok: true,
        value: { ndefMessage: [uriRecord(TAG_LINK)] },
      };

      await service.readNFCTag();

      expect(handleDeepLink).toHaveBeenCalledOnceWith(TAG_LINK);
    });

    it('logs a failed scan on iOS without an alert', async () => {
      nfc.scanAnswer = { ok: false, error: 'Session invalidated' };

      await service.readNFCTag();

      expect(error).toHaveBeenCalledOnceWith(
        "We couldn't read NFC-Tag: Session invalidated",
      );
      expect(handleDeepLink).not.toHaveBeenCalled();
      expect(showMessage).not.toHaveBeenCalled();
    });
  });

  describe('at app start', () => {
    function start(platforms: string[]): NfcInternals {
      TestBed.configureTestingModule({
        providers: [
          NfcService,
          {
            provide: Platform,
            useValue: { is: (name: string) => platforms.includes(name) },
          },
          {
            provide: UIHelper,
            useValue: { isBeanconqurorAppReady: () => Promise.resolve() },
          },
          { provide: NFC_PORT, useValue: nfc },
          { provide: UIAlert, useValue: { showMessage } },
          { provide: IntentHandlerService, useValue: { handleDeepLink } },
          { provide: UIToast, useValue: {} },
          {
            provide: UILog,
            useValue: { log, error: jasmine.createSpy('error') },
          },
        ],
      });
      return TestBed.inject(NfcService) as unknown as NfcInternals;
    }

    let isEnabled: jasmine.Spy;
    let listen: jasmine.Spy;

    beforeEach(() => {
      isEnabled = spyOn(nfc, 'isEnabled').and.callThrough();
      listen = spyOn(nfc, 'listen').and.callThrough();
    });

    it('listens for tags on Android when NFC is on', async () => {
      const started = start(['capacitor', 'android']);
      await new Promise((resolve) => setTimeout(resolve));

      expect(started.isNFCEnabled()).toBeTrue();
      expect(listen).toHaveBeenCalledTimes(1);
    });

    it('does not listen on Android when NFC is off', async () => {
      nfc.enabled = false;

      const started = start(['capacitor', 'android']);
      await new Promise((resolve) => setTimeout(resolve));

      expect(started.isNFCEnabled()).toBeFalse();
      expect(listen).not.toHaveBeenCalled();
    });

    it('takes NFC as on for iOS without asking the plugin', async () => {
      const started = start(['capacitor', 'ios']);
      await new Promise((resolve) => setTimeout(resolve));

      expect(started.isNFCEnabled()).toBeTrue();
      expect(isEnabled).not.toHaveBeenCalled();
      expect(listen).not.toHaveBeenCalled();
    });

    it('leaves NFC off in the browser', async () => {
      const started = start([]);
      await new Promise((resolve) => setTimeout(resolve));

      expect(started.isNFCEnabled()).toBeFalse();
      expect(isEnabled).not.toHaveBeenCalled();
    });
  });
});
