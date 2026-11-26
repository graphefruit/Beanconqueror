import type { NfcPort, NfcTag, NfcTagEvent } from '../services/ports/nfc-port';
import type { PortResult } from '../services/ports/port-result';

/** NFC_PORT without hardware for unit tests; set the answers, then call the code under test. */
export class FakeNfcPort implements NfcPort {
  public enabled = true;
  /** The answer of the next scans; without a tag the scan fails like a closed sheet. */
  public scanAnswer: PortResult<NfcTag | undefined> = {
    ok: false,
    error: 'Session invalidated by user',
  };
  /** When set, writing fails with this message. */
  public writeError: string | undefined;
  public readonly written: string[] = [];
  private onTag: ((event: NfcTagEvent) => void) | undefined;

  public isEnabled(): Promise<boolean> {
    return Promise.resolve(this.enabled);
  }

  public scanTag(): Promise<PortResult<NfcTag | undefined>> {
    return Promise.resolve(this.scanAnswer);
  }

  public listen(onTag: (event: NfcTagEvent) => void): void {
    this.onTag ??= onTag;
  }

  public writeUri(uri: string): Promise<PortResult<void>> {
    if (this.writeError !== undefined) {
      return Promise.resolve({ ok: false, error: this.writeError });
    }
    this.written.push(uri);
    return Promise.resolve({ ok: true, value: undefined });
  }

  /** Hands a tag to the listener as the OS would; false if nobody listens. */
  public present(event: NfcTagEvent): boolean {
    this.onTag?.(event);
    return this.onTag !== undefined;
  }
}
