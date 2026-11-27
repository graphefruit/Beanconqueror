import { InjectionToken } from '@angular/core';

import type { INdefRecord } from '../nfcService/nfc-tag-link';
import { CordovaNfcAdapter, CordovaNfcPlugin } from './cordova-nfc-adapter';
import type { PortResult } from './port-result';

export interface NfcTag {
  readonly ndefMessage?: readonly INdefRecord[];
}

/** A tag the OS hands to the app. */
export interface NfcTagEvent {
  readonly tag?: NfcTag;
  /**
   * True for a tag that started the app or reached it in the background: its link opens.
   * False for a tag held to the reader in the app, which a running read or write waits for.
   */
  readonly opensApp: boolean;
}

/**
 * The app's only way to NFC. Messages and explanations stay with the caller; failures arrive
 * as results.
 */
export interface NfcPort {
  /** Whether NFC is switched on (asked on Android only); false without NFC. */
  isEnabled(): Promise<boolean>;
  /** Reads one tag in the system sheet (iOS). */
  scanTag(): Promise<PortResult<NfcTag | undefined>>;
  /** Hands every tag to `onTag` (Android); only the first call attaches. */
  listen(onTag: (event: NfcTagEvent) => void): void;
  /** Writes `uri` as the only record of the next tag. */
  writeUri(uri: string): Promise<PortResult<void>>;
}

export const NFC_PORT = new InjectionToken<NfcPort>('NFC_PORT', {
  providedIn: 'root',
  factory: () =>
    new CordovaNfcAdapter(
      // The Cordova plugin sets this global on native platforms only.
      () => (window as { NfcPlugin?: CordovaNfcPlugin }).NfcPlugin,
      document,
    ),
});
