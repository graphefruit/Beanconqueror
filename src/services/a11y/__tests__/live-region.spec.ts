import { LiveAnnouncer } from '@angular/cdk/a11y';
import { DOCUMENT } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { UILog } from '../../uiLog';
import {
  LIVE_REGION,
  LIVE_REGION_CLEAR_AFTER_MS,
  LIVE_REGION_NEXT_MESSAGE_AFTER_MS,
  OVERLAY_CLOSED_SETTLE_MS,
  OVERLAY_CLOSING_MAX_HOLD_MS,
} from '../live-region';

/** The CDK writes a message this long after it was handed over. */
const CDK_WRITE_DELAY_MS = 100;

describe('LIVE_REGION', () => {
  it('is the live region of the CDK, present before the first message', () => {
    TestBed.inject(LIVE_REGION);

    const regions = TestBed.inject(DOCUMENT).querySelectorAll(
      'body > .cdk-live-announcer-element',
    );
    expect(regions.length).toBe(1);
    expect(regions[0].textContent).toBe('');
    expect(regions[0].getAttribute('aria-live')).toBe('polite');
    expect(regions[0].getAttribute('aria-atomic')).toBe('true');
  });

  it('writes a message with its politeness and clears it again later', fakeAsync(() => {
    const liveRegion = TestBed.inject(LIVE_REGION);
    const region = TestBed.inject(DOCUMENT).querySelector(
      '.cdk-live-announcer-element',
    );

    liveRegion.announce('Scale disconnected', 'assertive');
    tick(CDK_WRITE_DELAY_MS);
    expect(region.textContent).toBe('Scale disconnected');
    expect(region.getAttribute('aria-live')).toBe('assertive');

    liveRegion.announce('Brew added successfully', 'polite');
    tick(LIVE_REGION_NEXT_MESSAGE_AFTER_MS + CDK_WRITE_DELAY_MS);
    expect(region.textContent).toBe('Brew added successfully');
    expect(region.getAttribute('aria-live')).toBe('polite');

    tick(LIVE_REGION_CLEAR_AFTER_MS - 1);
    expect(region.textContent).toBe('Brew added successfully');
    tick(1);
    expect(region.textContent).toBe('');
  }));

  it('announces the next message after one has failed', fakeAsync(() => {
    const announce = spyOn(
      TestBed.inject(LiveAnnouncer),
      'announce',
    ).and.callFake(() => {
      announce.and.callThrough();
      throw new Error('live region gone');
    });
    const uiLog = spyOn(TestBed.inject(UILog), 'error');
    const liveRegion = TestBed.inject(LIVE_REGION);
    const region = TestBed.inject(DOCUMENT).querySelector(
      '.cdk-live-announcer-element',
    );

    liveRegion.announce('Scale disconnected', 'assertive');
    liveRegion.announce('Brew added successfully', 'polite');
    tick(CDK_WRITE_DELAY_MS);
    expect(region.textContent).toBe('Brew added successfully');
    expect(uiLog).toHaveBeenCalledOnceWith(
      'Live region: announcement failed',
      jasmine.any(Error),
    );
    tick(LIVE_REGION_CLEAR_AFTER_MS);
  }));

  it('writes each of two messages passed on at once', fakeAsync(() => {
    const liveRegion = TestBed.inject(LIVE_REGION);
    const region = TestBed.inject(DOCUMENT).querySelector(
      '.cdk-live-announcer-element',
    );

    liveRegion.announce('Bean archived', 'polite');
    liveRegion.announce('Bean saved', 'polite');
    tick(CDK_WRITE_DELAY_MS);
    expect(region.textContent).toBe('Bean archived');
    tick(LIVE_REGION_NEXT_MESSAGE_AFTER_MS - 1);
    expect(region.textContent).toBe('Bean archived');
    tick(1 + CDK_WRITE_DELAY_MS);
    expect(region.textContent).toBe('Bean saved');
    tick(LIVE_REGION_CLEAR_AFTER_MS);
  }));

  it('writes only the newest value of a key, and every other message', fakeAsync(() => {
    const liveRegion = TestBed.inject(LIVE_REGION);
    const region = TestBed.inject(DOCUMENT).querySelector(
      '.cdk-live-announcer-element',
    );
    const next = LIVE_REGION_NEXT_MESSAGE_AFTER_MS + CDK_WRITE_DELAY_MS;

    liveRegion.announce('Time 1', 'assertive', 'time');
    tick(CDK_WRITE_DELAY_MS);
    expect(region.textContent).toBe('Time 1');
    liveRegion.announce('Time 1.25', 'assertive', 'time');
    liveRegion.announce('Bean saved', 'polite');
    liveRegion.announce('Time 1.5', 'assertive', 'time');
    liveRegion.announce('Bean archived', 'polite');
    liveRegion.announce('Time 1.75', 'assertive', 'time');
    // One more turn than messages: no outdated time follows the newest.
    const written: string[] = [];
    for (let turn = 0; turn < 4; turn++) {
      tick(next);
      written.push(region.textContent);
    }

    expect(written).toEqual([
      'Bean saved',
      'Bean archived',
      'Time 1.75',
      'Time 1.75',
    ]);
    tick(LIVE_REGION_CLEAR_AFTER_MS);
  }));

  describe('while an overlay closes', () => {
    // The overlay stays put while it closes, so its events reach the document.
    const overlayEvent = (type: string) =>
      TestBed.inject(DOCUMENT).body.dispatchEvent(
        new CustomEvent(type, { bubbles: true }),
      );

    it('writes a message only once the focus is back on the page', fakeAsync(() => {
      const liveRegion = TestBed.inject(LIVE_REGION);
      const region = TestBed.inject(DOCUMENT).querySelector(
        '.cdk-live-announcer-element',
      );

      overlayEvent('ionModalWillDismiss');
      liveRegion.announce('Favourite added', 'polite');
      tick(1_000);
      expect(region.textContent).toBe('');

      overlayEvent('ionModalDidDismiss');
      tick(OVERLAY_CLOSED_SETTLE_MS - 100);
      expect(region.textContent).toBe('');
      tick(100 + 50 + CDK_WRITE_DELAY_MS);
      expect(region.textContent).toBe('Favourite added');
      tick(LIVE_REGION_CLEAR_AFTER_MS);
    }));

    it('keeps the order of the messages it holds', fakeAsync(() => {
      const liveRegion = TestBed.inject(LIVE_REGION);
      const region = TestBed.inject(DOCUMENT).querySelector(
        '.cdk-live-announcer-element',
      );

      overlayEvent('ionAlertWillDismiss');
      liveRegion.announce('Bean archived', 'polite');
      liveRegion.announce('Bean saved', 'polite');
      overlayEvent('ionAlertDidDismiss');
      tick(OVERLAY_CLOSED_SETTLE_MS + CDK_WRITE_DELAY_MS - 1);
      expect(region.textContent).toBe('');
      tick(1);
      expect(region.textContent).toBe('Bean archived');
      tick(LIVE_REGION_NEXT_MESSAGE_AFTER_MS + CDK_WRITE_DELAY_MS);
      expect(region.textContent).toBe('Bean saved');
      tick(LIVE_REGION_CLEAR_AFTER_MS);
    }));

    it('does not hold a message for ever when the closing event is lost', fakeAsync(() => {
      const liveRegion = TestBed.inject(LIVE_REGION);
      const region = TestBed.inject(DOCUMENT).querySelector(
        '.cdk-live-announcer-element',
      );

      overlayEvent('ionPopoverWillDismiss');
      liveRegion.announce('Scale disconnected', 'assertive');
      tick(OVERLAY_CLOSING_MAX_HOLD_MS - 100);
      expect(region.textContent).toBe('');
      tick(100 + 50 + CDK_WRITE_DELAY_MS);
      expect(region.textContent).toBe('Scale disconnected');
      overlayEvent('ionPopoverDidDismiss');
      tick(LIVE_REGION_CLEAR_AFTER_MS);
    }));

    it('holds no later message once a closing event was lost', fakeAsync(() => {
      const liveRegion = TestBed.inject(LIVE_REGION);
      const region = TestBed.inject(DOCUMENT).querySelector(
        '.cdk-live-announcer-element',
      );

      overlayEvent('ionPopoverWillDismiss');
      tick(OVERLAY_CLOSING_MAX_HOLD_MS);
      liveRegion.announce('Scale disconnected', 'assertive');
      tick(CDK_WRITE_DELAY_MS);
      expect(region.textContent).toBe('Scale disconnected');
      tick(LIVE_REGION_CLEAR_AFTER_MS);
    }));
  });
});
