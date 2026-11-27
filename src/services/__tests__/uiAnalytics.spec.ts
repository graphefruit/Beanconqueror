import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AlertController } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';

import { Brew } from '../../classes/brew/brew';
import { DEVICE_STORAGE_KEY } from '../../classes/changeTracking/localStorageKeys';
import { Settings } from '../../classes/settings/settings';
import { UIAlert } from '../uiAlert';
import { UIAnalytics } from '../uiAnalytics';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';

const USER_ID = 'tracking-user-4711';

describe('UIAnalytics bulk tracking', () => {
  let analytics: UIAnalytics;
  let logged: unknown[][];

  beforeEach(() => {
    logged = [];
    const record = (...args: unknown[]) => logged.push(args);
    analytics = Object.assign(Object.create(UIAnalytics.prototype), {
      canTrack: true,
      siteId: '2',
      matomoUrl: 'https://analytics.example/matomo.php',
      uiSettings: { getSettings: () => ({ matomo_analytics_id: USER_ID }) },
      uiLog: {
        log: record,
        debug: record,
        info: record,
        warn: record,
        error: record,
      },
    }) as UIAnalytics;
  });

  it('sends the user id to Matomo but keeps it out of the app log', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(() =>
      Promise.resolve(new Response('{}', { status: 200 })),
    );

    await analytics.trackBulkEvents([{ category: 'Bean', action: 'Add' }]);
    await analytics.trackBulkContentImpressions([
      { contentName: 'Brew', contentPiece: 'Card' },
    ]);

    const sent = fetchSpy.calls
      .allArgs()
      .map(([, options]) => options?.body as string);
    expect(sent.length).toBe(2);
    for (const body of sent) {
      expect(body).toContain(`uid=${USER_ID}`);
    }
    expect(logged.length).toBeGreaterThan(0);
    expect(JSON.stringify(logged)).not.toContain(USER_ID);
  });

  for (const status of [200, 500]) {
    it(`logs only the status of a Matomo answer (${status})`, async () => {
      spyOn(window, 'fetch').and.callFake(() =>
        Promise.resolve(
          new Response(JSON.stringify({ visitor: USER_ID }), { status }),
        ),
      );

      await analytics.trackBulkEvents([{ category: 'Bean', action: 'Add' }]);
      await analytics.trackBulkContentImpressions([
        { contentName: 'Brew', contentPiece: 'Card' },
      ]);

      expect(JSON.stringify(logged)).toContain(`Status: ${status}`);
      expect(JSON.stringify(logged)).not.toContain(USER_ID);
    });
  }
});

const TRACKER_URL = 'https://analytics.example/matomo.php';
const ANALYTICS_ID = 'analytics-id-0815';
const DEVICE_ID = 'sync-device-id-4711';

/** The Matomo tracker of the app, configured as in index.html. */
function loadMatomo(): Promise<void> {
  if (typeof (window as { Matomo?: unknown }).Matomo !== 'undefined') {
    return Promise.resolve();
  }
  (window as { _paq?: unknown[] })._paq = [
    ['requireConsent'],
    ['setTrackerUrl', TRACKER_URL],
    ['setSiteId', '2'],
  ];
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/assets/js/matomo.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('matomo.js not loaded'));
    document.head.append(script);
  });
}

describe('UIAnalytics keeps the sync device id out of what it sends', () => {
  let analytics: UIAnalytics;
  let settings: Settings;
  let brew: Brew;
  let sent: string[];
  let storedDevice: string | null;
  let fetchSpy: jasmine.Spy;

  let defaultTimeout: number;

  beforeAll(async () => {
    defaultTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
    await loadMatomo();
  });

  afterAll(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = defaultTimeout;
  });

  beforeEach(async () => {
    sent = [];
    spyOn(navigator, 'sendBeacon').and.callFake(
      (_url: string | URL, _data?: BodyInit | null) => {
        void (async () => {
          const body = _data instanceof Blob ? await _data.text() : '';
          sent.push(decodeURIComponent(`${String(_url)} ${body}`));
        })();
        return true;
      },
    );
    fetchSpy = spyOn(window, 'fetch').and.callFake(
      (_url: RequestInfo | URL, _init?: RequestInit) => {
        // The app sends a URL string and a JSON string.
        sent.push(
          decodeURIComponent(`${_url as string} ${_init?.body as string}`),
        );
        return Promise.resolve(new Response('{}', { status: 200 }));
      },
    );

    storedDevice = localStorage.getItem(DEVICE_STORAGE_KEY);
    localStorage.setItem(
      DEVICE_STORAGE_KEY,
      JSON.stringify({ device_id: DEVICE_ID, created_at: 1 }),
    );
    settings = new Settings();
    settings.matomo_analytics = true;
    settings.matomo_analytics_id = ANALYTICS_ID;
    brew = new Brew();
    brew.grind_size = '12';

    TestBed.configureTestingModule({
      providers: [
        UIAnalytics,
        provideRouter([{ path: '**', children: [] }]),
        {
          provide: UISettingsStorage,
          useValue: {
            storageReady: () => Promise.resolve(),
            getSettings: () => settings,
            saveSettings: () => Promise.resolve(),
          },
        },
        {
          provide: UILog,
          useValue: {
            log: () => undefined,
            info: () => undefined,
            warn: () => undefined,
            error: () => undefined,
          },
        },
        { provide: AlertController, useValue: {} },
        { provide: TranslateService, useValue: {} },
        { provide: UIHelper, useValue: {} },
        { provide: UIAlert, useValue: {} },
      ],
    });
    analytics = TestBed.inject(UIAnalytics);
    await analytics.initializeTracking();
  });

  afterEach(() => {
    analytics.disableTracking();
    if (storedDevice === null) {
      localStorage.removeItem(DEVICE_STORAGE_KEY);
    } else {
      localStorage.setItem(DEVICE_STORAGE_KEY, storedDevice);
    }
  });

  /**
   * Waits for `_count` requests, at most a little longer than Matomo holds
   * requests in its queue (2.5 s).
   */
  async function sentRequests(_count: number): Promise<string[]> {
    for (let i = 0; i < 150 && sent.length < _count; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return sent;
  }

  function expectNothingPersonal(_requests: string[]) {
    expect(_requests.length).toBeGreaterThan(0);
    for (const request of _requests) {
      expect(request).not.toContain(DEVICE_ID);
      expect(request).toContain(`uid=${ANALYTICS_ID}`);
    }
  }

  it('in an event with a custom dimension', async () => {
    analytics.trackCustomDimension(1, brew.grind_size);
    analytics.trackEvent('BREW', 'GRIND_SIZE', brew.grind_size);

    expectNothingPersonal(await sentRequests(1));
    expect(sent[0]).toContain('dimension1=12');
  });

  it('in a content impression', async () => {
    analytics.trackContentImpression('BREW', brew.grind_size);

    expectNothingPersonal(await sentRequests(1));
  });

  it('as the user id, which is its own when none is stored yet', async () => {
    settings.matomo_analytics_id = '';
    await analytics.enableTracking();
    analytics.trackEvent('BREW', 'ADD');

    expect(settings.matomo_analytics_id).not.toBe('');
    expect(settings.matomo_analytics_id).not.toBe(DEVICE_ID);
    const [request] = await sentRequests(1);
    expect(request).toContain(`uid=${settings.matomo_analytics_id}`);
    expect(request).not.toContain(DEVICE_ID);
  });

  it('in a page view, also one reached by navigation', async () => {
    analytics.trackPage('/brews');
    await TestBed.inject(Router).navigateByUrl(`/brew/${brew.config.uuid}`);

    expectNothingPersonal(await sentRequests(2));
    expect(sent.length).toBe(2);
  });

  it('in bulk events', async () => {
    await analytics.trackBulkEvents([
      { category: 'BREW', action: 'GRIND_SIZE', name: brew.grind_size },
      { category: 'BREW', action: 'RATING', value: brew.rating },
    ]);

    expectNothingPersonal(sent);
  });

  it('in bulk content impressions', async () => {
    await analytics.trackBulkContentImpressions([
      { contentName: 'BREW', contentPiece: brew.grind_size },
    ]);

    expectNothingPersonal(sent);
  });

  it('sends no empty bulk request', async () => {
    await analytics.trackBulkEvents([]);
    await analytics.trackBulkContentImpressions([]);

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends nothing without consent', async () => {
    analytics.disableTracking();

    analytics.trackEvent('BREW', 'GRIND_SIZE', brew.grind_size);
    analytics.trackPage('/brews');
    analytics.trackContentImpression('BREW', brew.grind_size);
    analytics.trackCustomDimension(1, brew.grind_size);
    await analytics.trackBulkEvents([{ category: 'BREW', action: 'ADD' }]);
    await analytics.trackBulkContentImpressions([
      { contentName: 'BREW', contentPiece: brew.grind_size },
    ]);

    expect(await sentRequests(1)).toEqual([]);
  });
});
