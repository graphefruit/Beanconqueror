import { DOCUMENT } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { LIVE_REGION, LIVE_REGION_CLEAR_AFTER_MS } from '../live-region';

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
    tick(CDK_WRITE_DELAY_MS);
    expect(region.textContent).toBe('Brew added successfully');
    expect(region.getAttribute('aria-live')).toBe('polite');

    tick(LIVE_REGION_CLEAR_AFTER_MS - 1);
    expect(region.textContent).toBe('Brew added successfully');
    tick(1);
    expect(region.textContent).toBe('');
  }));
});
