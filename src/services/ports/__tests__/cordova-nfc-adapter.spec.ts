import { TestBed } from '@angular/core/testing';

import { nfcPortContract } from '../../../test-utils/contracts/nfc-port.contract';
import { CordovaNfcAdapter, CordovaNfcPlugin } from '../cordova-nfc-adapter';
import { NFC_PORT, NfcTag } from '../nfc-port';

/** The plugin global as community-cordova-plugin-nfc sets it, answering like a device. */
class PluginStub implements CordovaNfcPlugin {
  public on = true;
  public scanAnswer: NfcTag | Error | string = {};
  public writeError: unknown;
  public readonly records: unknown[][] = [];
  public listener: Parameters<CordovaNfcPlugin['addNdefListener']>[0];
  public readonly NdefPlugin = { uriRecord: (uri: string) => ({ uri }) };

  public enabled(success: () => void, failure: (error: unknown) => void) {
    if (this.on) {
      success();
    } else {
      failure('NFC_DISABLED');
    }
  }

  public scanTag(): Promise<NfcTag> {
    const answer = this.scanAnswer;
    return typeof answer === 'string' || answer instanceof Error
      ? // The plugin rejects with plain text on iOS.
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        Promise.reject(answer)
      : Promise.resolve(answer);
  }

  public addNdefListener(callback: PluginStub['listener']) {
    this.listener = callback;
  }

  public write(
    records: unknown[],
    success: () => void,
    failure: (error: unknown) => void,
  ) {
    if (this.writeError === undefined) {
      this.records.push(records);
      success();
    } else {
      failure(this.writeError);
    }
  }
}

nfcPortContract('CordovaNfcAdapter', () => {
  const plugin = new PluginStub();
  return {
    port: new CordovaNfcAdapter(() => plugin, new EventTarget()),
    setEnabled: (enabled) => (plugin.on = enabled),
    answerScan: (answer) => (plugin.scanAnswer = answer),
    failWrites: (message) => (plugin.writeError = message),
    written: () =>
      plugin.records.map((records) => (records[0] as { uri: string }).uri),
    present: (tag, opensApp) => plugin.listener?.({ tag, launch: opensApp }),
  };
});

describe('CordovaNfcAdapter', () => {
  const TAG: NfcTag = { ndefMessage: [] };
  let plugin: PluginStub;
  let events: EventTarget;
  let adapter: CordovaNfcAdapter;

  beforeEach(() => {
    plugin = new PluginStub();
    events = new EventTarget();
    adapter = new CordovaNfcAdapter(() => plugin, events);
  });

  function mimeEvent(launch?: boolean): Event {
    return Object.assign(new Event('ndef-mime'), { tag: TAG, launch });
  }

  it('writes the link as the only URI record', async () => {
    await adapter.writeUri('https://beanconqueror.com/app/nfc/#A/B');

    expect(plugin.records).toEqual([
      [{ uri: 'https://beanconqueror.com/app/nfc/#A/B' }],
    ]);
  });

  it('passes on a plugin failure given as text', async () => {
    plugin.scanAnswer = 'Session invalidated by user';
    plugin.writeError = 'Tag is read only';

    expect(await adapter.scanTag()).toEqual({
      ok: false,
      error: 'Session invalidated by user',
    });
    expect(await adapter.writeUri('x')).toEqual({
      ok: false,
      error: 'Tag is read only',
    });
  });

  it('opens a tag the OS hands over in the background', () => {
    const onTag = jasmine.createSpy('onTag');
    adapter.listen(onTag);

    events.dispatchEvent(mimeEvent());

    expect(onTag).toHaveBeenCalledOnceWith({ tag: TAG, opensApp: true });
  });

  it('leaves the launch tag to the NDEF listener, so it opens once', () => {
    const onTag = jasmine.createSpy('onTag');
    adapter.listen(onTag);

    events.dispatchEvent(mimeEvent(true));
    plugin.listener({ tag: TAG, launch: true });

    expect(onTag).toHaveBeenCalledOnceWith({ tag: TAG, opensApp: true });
  });

  it('works without NFC, as in the browser', async () => {
    const browser = new CordovaNfcAdapter(() => undefined, events);
    const onTag = jasmine.createSpy('onTag');

    expect(await browser.isEnabled()).toBeFalse();
    expect(await browser.scanTag()).toEqual({
      ok: false,
      error: 'NFC unavailable',
    });
    expect(await browser.writeUri('x')).toEqual({
      ok: false,
      error: 'NFC unavailable',
    });
    browser.listen(onTag);
    events.dispatchEvent(mimeEvent());
    expect(onTag).not.toHaveBeenCalled();
  });

  describe('NFC_PORT', () => {
    const globals = window as { NfcPlugin?: CordovaNfcPlugin };

    afterEach(() => delete globals.NfcPlugin);

    it('reads the plugin global when it is used, after Cordova has set it', async () => {
      const port = TestBed.inject(NFC_PORT);
      expect(await port.isEnabled()).toBeFalse();

      globals.NfcPlugin = plugin;

      expect(await port.isEnabled()).toBeTrue();
    });

    it('takes the background tags from the document', () => {
      globals.NfcPlugin = plugin;
      const onTag = jasmine.createSpy('onTag');
      TestBed.inject(NFC_PORT).listen(onTag);

      document.dispatchEvent(mimeEvent());

      expect(onTag).toHaveBeenCalledOnceWith({ tag: TAG, opensApp: true });
    });
  });
});
