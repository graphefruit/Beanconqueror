import { inject, Injectable } from '@angular/core';

import { AnnouncementPoliteness, LIVE_REGION } from './live-region';

/**
 * The same message is not spoken again within this time: a toast shown twice
 * in a row or a loading message that is closed and opened again at once is
 * heard once.
 */
export const REPEAT_WINDOW_MS = 2000;

/**
 * Progress messages are spoken at most this often. A screen reader needs a
 * second or two for a message and queues polite ones, so a faster sequence
 * would pile up and still be spoken after the work is done.
 */
export const PROGRESS_INTERVAL_MS = 3000;

/** A message that keeps changing while some work runs, e.g. a loading message. */
export interface ProgressAnnouncement {
  /**
   * The message changed. The latest message is spoken, at most once per
   * PROGRESS_INTERVAL_MS and only if it differs from the one spoken last.
   */
  update(message: string): void;
  /** The work is over: says nothing and drops an update still waiting. */
  end(): void;
}

function normalize(message: string | null | undefined): string {
  return (message ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Speaks status messages without moving focus (WCAG 4.1.3), e.g. toasts and
 * the loading message. All of them go through the one live region of
 * LIVE_REGION, so a message is never announced from two places at once.
 */
@Injectable({
  providedIn: 'root',
})
export class Announcer {
  private readonly liveRegion = inject(LIVE_REGION);

  private lastMessage = '';
  private lastMessageAt = Number.NEGATIVE_INFINITY;

  /**
   * Announces `message`, unless it is empty or is the message announced last,
   * less than REPEAT_WINDOW_MS ago. Use `assertive` only for what must
   * interrupt the user. Returns whether the message was passed on to the
   * screen reader.
   */
  public announce(
    message: string,
    politeness: AnnouncementPoliteness = 'polite',
  ): boolean {
    const text = normalize(message);
    if (text === '') {
      return false;
    }
    const now = Date.now();
    if (
      text === this.lastMessage &&
      now - this.lastMessageAt < REPEAT_WINDOW_MS
    ) {
      return false;
    }
    this.lastMessage = text;
    this.lastMessageAt = now;
    this.liveRegion.announce(text, politeness);
    return true;
  }

  /** Announces `message` politely at once and returns its handle for updates. */
  public startProgress(message: string): ProgressAnnouncement {
    return new ThrottledProgress((text) => this.announce(text), message);
  }
}

class ThrottledProgress implements ProgressAnnouncement {
  private spoken: string;
  private spokenAt: number;
  private pending: string | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private ended = false;

  constructor(
    private readonly speak: (message: string) => void,
    message: string,
  ) {
    this.spoken = normalize(message);
    this.spokenAt = Date.now();
    this.speak(this.spoken);
  }

  public update(message: string): void {
    const text = normalize(message);
    if (this.ended || text === '') {
      return;
    }
    if (text === this.spoken) {
      // Back to what the user heard last; an update in between is outdated.
      this.cancelPending();
      return;
    }
    this.pending = text;
    if (this.timer !== undefined) {
      return;
    }
    const wait = this.spokenAt + PROGRESS_INTERVAL_MS - Date.now();
    if (wait > 0) {
      this.timer = setTimeout(() => this.flush(), wait);
    } else {
      this.flush();
    }
  }

  public end(): void {
    this.ended = true;
    this.cancelPending();
  }

  private flush(): void {
    this.timer = undefined;
    if (this.pending === undefined) {
      return;
    }
    this.spoken = this.pending;
    this.spokenAt = Date.now();
    this.pending = undefined;
    this.speak(this.spoken);
  }

  private cancelPending(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.pending = undefined;
  }
}
