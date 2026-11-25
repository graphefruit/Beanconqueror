import { NfcService } from './nfc-service.service';

interface NfcInternals {
  __handleNFCData(tag: unknown): void;
  __writeInternal(text: string): void;
}

const SERIAL = [4, 87, 51, 2, 202, 96, 128];
const LINK = 'https://beanconqueror.com/?shareUserBean0=' + 'Q'.repeat(300);

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
        textRecord: (text: string) => ({ text }),
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

  it('logs only the start of the text written to a tag', () => {
    write.and.callFake((_record: unknown, success: () => void) => success());

    service.__writeInternal(LINK);

    expect(log.calls.allArgs()).toEqual([
      [
        `NFC-Date wrote successfully: ${LINK.slice(0, 100)}… (${LINK.length} chars)`,
      ],
    ]);
  });

  it('logs only the start of the text that could not be written', () => {
    write.and.callFake(
      (_record: unknown, _success: () => void, failure: () => void) =>
        failure(),
    );

    service.__writeInternal(LINK);

    expect(log.calls.allArgs()).toEqual([
      [
        `NFC-Date wrote unsuccessfully: ${LINK.slice(0, 100)}… (${LINK.length} chars)`,
      ],
    ]);
  });
});
