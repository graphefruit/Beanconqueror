import { Subject } from 'rxjs';

import de from '../../assets/i18n/de.json';
import en from '../../assets/i18n/en.json';
import { NfcService } from './nfc-service.service';

interface NfcInternals {
  __handleNFCData(tag: unknown): void;
  __writeInternal(link: string): void;
  listenToNFCAndroid(): void;
  writeNFCData(link: string): void;
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
  let log: jasmine.Spy;
  let handleDeepLink: jasmine.Spy;
  let write: jasmine.Spy;
  let showMessage: jasmine.Spy;
  const globals = window as unknown as { NfcPlugin?: unknown };

  beforeEach(() => {
    log = jasmine.createSpy('log');
    handleDeepLink = jasmine.createSpy('handleDeepLink');
    write = jasmine.createSpy('write');
    globals.NfcPlugin = {
      NdefPlugin: {
        uriRecord: (uri: string) => ({ uri }),
      },
      write,
    };
    showMessage = jasmine.createSpy('showMessage');
    service = Object.assign(Object.create(NfcService.prototype), {
      uiLog: { log, error: jasmine.createSpy('error') },
      uiAlert: { showMessage },
      intentHandler: { handleDeepLink },
      platform: { is: () => false },
    }) as NfcInternals;
  });

  afterEach(() => {
    delete globals.NfcPlugin;
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

  it('writes the link as a URI record and keeps it out of the log', () => {
    write.and.callFake((_record: unknown, success: () => void) => success());

    service.__writeInternal(TAG_LINK);

    expect(write.calls.argsFor(0)[0]).toEqual([{ uri: TAG_LINK }]);
    expect(log.calls.allArgs()).toEqual([['NFC tag written']]);
  });

  for (const [name, written, key] of [
    ['success', true, 'NFC.WRITE_COMPLETED'],
    ['failure', false, 'NFC.WRITE_UNCOMPLETED'],
  ] as const) {
    it(`reports the ${name} of writing on Android`, () => {
      service = Object.assign(service, {
        platform: { is: (os: string) => os === 'android' },
      });
      write.and.callFake(
        (_record: unknown, success: () => void, failure: () => void) =>
          written ? success() : failure(),
      );

      service.__writeInternal(TAG_LINK);

      expect(showMessage).toHaveBeenCalledOnceWith(
        `${key}_DESCRIPTION`,
        `${key}_TITLE`,
        'OK',
        true,
      );
    });
  }

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

  it('keeps the link out of the log when writing fails', () => {
    write.and.callFake(
      (_record: unknown, _success: () => void, failure: () => void) =>
        failure(),
    );

    service.__writeInternal(TAG_LINK);

    expect(log.calls.allArgs()).toEqual([['NFC tag not written']]);
  });

  it('writes right away on iOS', () => {
    service.writeNFCData(TAG_LINK);

    expect(write.calls.argsFor(0)[0]).toEqual([{ uri: TAG_LINK }]);
  });

  it('writes on Android once a tag is held to the reader', () => {
    const tags = new Subject<unknown>();
    Object.assign(service, {
      platform: { is: (name: string) => name === 'android' },
      uiToast: { showInfoToastBottom: jasmine.createSpy('toast') },
      androidMessageSubject: tags,
    });

    service.writeNFCData(TAG_LINK);
    expect(write).not.toHaveBeenCalled();
    tags.next({ tag: {} });
    tags.next({ tag: {} });

    expect(write.calls.allArgs().map((args): unknown => args[0])).toEqual([
      [{ uri: TAG_LINK }],
    ]);
  });

  describe('tags the OS hands to the app', () => {
    const tag = { id: SERIAL, ndefMessage: [uriRecord(TAG_LINK)] };
    let ndefListener: (event: unknown) => void;
    let mimeListener: (event: unknown) => void;
    let tags: Subject<unknown>;
    let next: jasmine.Spy;

    beforeEach(() => {
      Object.assign(globals.NfcPlugin as object, {
        addNdefListener: (callback: (event: unknown) => void) => {
          ndefListener = callback;
        },
      });
      spyOn(document, 'addEventListener').and.callFake(((
        type: string,
        callback: (event: unknown) => void,
      ) => {
        if (type === 'ndef-mime') {
          mimeListener = callback;
        }
      }) as typeof document.addEventListener);
      tags = new Subject<unknown>();
      next = spyOn(tags, 'next');
      Object.assign(service, {
        didAndroidAttachToListener: false,
        androidMessageSubject: tags,
      });
      service.listenToNFCAndroid();
    });

    it('opens the link of the tag that started the app', () => {
      ndefListener({ type: 'ndef-mime', tag, launch: true });

      expect(handleDeepLink).toHaveBeenCalledOnceWith(TAG_LINK);
      expect(next).not.toHaveBeenCalled();
    });

    it('opens the link of a tag read while the app is in the background', () => {
      mimeListener({ type: 'ndef-mime', tag });

      expect(handleDeepLink).toHaveBeenCalledOnceWith(TAG_LINK);
    });

    it('leaves the launch tag to the NDEF listener, so it opens once', () => {
      mimeListener({ type: 'ndef-mime', tag, launch: true });

      expect(handleDeepLink).not.toHaveBeenCalled();
    });

    it('hands a tag held to the reader in the app to reading or writing', () => {
      ndefListener({ type: 'ndef', tag });

      expect(next).toHaveBeenCalledOnceWith({ tag });
      expect(handleDeepLink).not.toHaveBeenCalled();
    });
  });
});
