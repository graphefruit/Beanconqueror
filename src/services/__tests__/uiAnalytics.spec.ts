import { UIAnalytics } from '../uiAnalytics';

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
