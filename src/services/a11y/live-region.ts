import { LiveAnnouncer } from '@angular/cdk/a11y';
import { inject, InjectionToken } from '@angular/core';

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
 * The app announces through the Angular CDK's LiveAnnouncer. It keeps one
 * visually hidden live region at the end of the body, created along with the
 * first service that announces, at start-up, so screen readers already know
 * the region when the first message is written to it. A region added together
 * with its text is often not announced at all. Unit tests provide a fake.
 */
export const LIVE_REGION = new InjectionToken<LiveRegion>('LIVE_REGION', {
  providedIn: 'root',
  factory: () => {
    const liveAnnouncer = inject(LiveAnnouncer);
    return {
      announce: (message, politeness) =>
        void liveAnnouncer.announce(
          message,
          politeness,
          LIVE_REGION_CLEAR_AFTER_MS,
        ),
    };
  },
});
