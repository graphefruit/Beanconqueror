import type { NfcPort, NfcTag, NfcTagEvent } from './nfc-port';
import type { PortResult } from './port-result';

/** An event of the NFC plugin; see www/phonegap-nfc.js. */
interface CordovaNfcEvent {
  tag?: NfcTag;
  launch?: boolean;
}

/** The part of community-cordova-plugin-nfc's `NfcPlugin` global the app uses. */
export interface CordovaNfcPlugin {
  enabled(success: () => void, failure: (error: unknown) => void): void;
  scanTag(): Promise<NfcTag>;
  addNdefListener(callback: (event: CordovaNfcEvent) => void): void;
  write(
    records: unknown[],
    success: () => void,
    failure: (error: unknown) => void,
  ): void;
  NdefPlugin: { uriRecord(uri: string): unknown };
}

const UNAVAILABLE: PortResult<never> = { ok: false, error: 'NFC unavailable' };

/** NFC_PORT over the Cordova plugin: the only code that touches its global. */
export class CordovaNfcAdapter implements NfcPort {
  private listening = false;

  constructor(
    private readonly plugin: () => CordovaNfcPlugin | undefined,
    /** Where the plugin fires its document events. */
    private readonly events: EventTarget,
  ) {}

  public isEnabled(): Promise<boolean> {
    const nfc = this.plugin();
    if (!nfc) {
      return Promise.resolve(false);
    }
    return new Promise((resolve) =>
      nfc.enabled(
        () => resolve(true),
        () => resolve(false),
      ),
    );
  }

  public async scanTag(): Promise<PortResult<NfcTag | undefined>> {
    const nfc = this.plugin();
    if (!nfc) {
      return UNAVAILABLE;
    }
    try {
      return { ok: true, value: await nfc.scanTag() };
    } catch (error) {
      return { ok: false, error: messageOf(error) };
    }
  }

  public listen(onTag: (event: NfcTagEvent) => void): void {
    const nfc = this.plugin();
    // Detaching does not drop the plugin's old handler, so the app attaches once.
    if (!nfc || this.listening) {
      return;
    }
    this.listening = true;
    // The plugin hands the tag that started the app to the first listener, marked as launch.
    nfc.addNdefListener((event) =>
      onTag({ tag: event.tag, opensApp: event.launch === true }),
    );
    // Tags of our NDEF_DISCOVERED filter (AndroidManifest) while the app is in the background;
    // the launch tag comes through the NDEF listener, so it opens once.
    this.events.addEventListener('ndef-mime', (event) => {
      const { tag, launch } = event as Event & CordovaNfcEvent;
      if (!launch) {
        onTag({ tag, opensApp: true });
      }
    });
  }

  public writeUri(uri: string): Promise<PortResult<void>> {
    const nfc = this.plugin();
    if (!nfc) {
      return Promise.resolve(UNAVAILABLE);
    }
    return new Promise((resolve) =>
      nfc.write(
        [nfc.NdefPlugin.uriRecord(uri)],
        () => resolve({ ok: true, value: undefined }),
        (error) => resolve({ ok: false, error: messageOf(error) }),
      ),
    );
  }
}

// Cordova plugins fail with plain text as well as with errors.
function messageOf(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  return (
    (error as { message?: string } | undefined)?.message ?? 'Unknown error'
  );
}
