import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DOCUMENT, inject, InjectionToken, NgZone } from '@angular/core';

/**
 * How a screen reader speaks a message: `polite` once it has finished what it
 * is saying, `assertive` at once, cutting that off.
 */
export type AnnouncementPoliteness = 'polite' | 'assertive';

/** The live region screen readers speak announcements from. */
export interface LiveRegion {
  announce(message: string, politeness: AnnouncementPoliteness): void;
}

/**
 * How long a message stays in the live region. Screen readers take it when it
 * is written. Left there, it could still be reached by swiping to the end of
 * the page long after it stopped being true.
 */
export const LIVE_REGION_CLEAR_AFTER_MS = 10_000;

/**
 * Time after an overlay has closed until a message is written. Ionic moves the
 * focus back to the page then, and VoiceOver reads the focused control and
 * drops a polite message written at the same time (e.g. the toast of an action
 * picked in the actions sheet, which runs while the sheet is still closing).
 */
export const OVERLAY_CLOSED_SETTLE_MS = 400;

/** A message is never held longer than this, e.g. if a closing event is lost. */
export const OVERLAY_CLOSING_MAX_HOLD_MS = 3_000;

/** Overlays that take focus and give it back when they close. */
const CLOSING_EVENT_PREFIXES = [
  'ionModal',
  'ionPopover',
  'ionAlert',
  'ionActionSheet',
  'ionLoading',
];

/**
 * Tells when the page is quiet enough for a message: no overlay closing, and
 * the last one closed at least OVERLAY_CLOSED_SETTLE_MS ago.
 */
function overlayClosingWatch(document: Document, zone: NgZone) {
  let closing = 0;
  let quietFrom = 0;
  zone.runOutsideAngular(() => {
    for (const prefix of CLOSING_EVENT_PREFIXES) {
      document.addEventListener(prefix + 'WillDismiss', () => closing++, true);
      document.addEventListener(
        prefix + 'DidDismiss',
        () => {
          closing = Math.max(0, closing - 1);
          quietFrom = Date.now() + OVERLAY_CLOSED_SETTLE_MS;
        },
        true,
      );
    }
  });
  return () => closing === 0 && Date.now() >= quietFrom;
}

/**
 * The app announces through the Angular CDK's LiveAnnouncer. It keeps one
 * visually hidden live region at the end of the body, created along with the
 * first service that announces, at start-up, so screen readers already know
 * the region when the first message is written to it. A region added together
 * with its text is often not announced at all. Messages wait while an overlay
 * closes (overlayClosingWatch) and keep their order. Unit tests provide a fake.
 */
export const LIVE_REGION = new InjectionToken<LiveRegion>('LIVE_REGION', {
  providedIn: 'root',
  factory: () => {
    const liveAnnouncer = inject(LiveAnnouncer);
    const zone = inject(NgZone);
    const isQuiet = overlayClosingWatch(inject(DOCUMENT), zone);
    let queue = Promise.resolve();
    const whenQuiet = () =>
      new Promise<void>((resolve) => {
        const heldSince = Date.now();
        const check = () =>
          isQuiet() || Date.now() - heldSince >= OVERLAY_CLOSING_MAX_HOLD_MS
            ? resolve()
            : setTimeout(check, 50);
        check();
      });
    return {
      announce: (message, politeness) => {
        queue = queue
          .then(whenQuiet)
          .then(
            () =>
              void liveAnnouncer.announce(
                message,
                politeness,
                LIVE_REGION_CLEAR_AFTER_MS,
              ),
          );
      },
    };
  },
});
