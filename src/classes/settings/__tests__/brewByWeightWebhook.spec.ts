import { WEBHOOK_AUTH_TYPE_ENUM } from '../../../enums/settings/webhookAuthType';
import { triggerBrewByWeightWebhook } from '../brewByWeightWebhook';
import { Settings } from '../settings';

const URL_WITH_KEY = 'https://hooks.example.com/stop/secret-key-123';

describe('triggerBrewByWeightWebhook', () => {
  let fetchSpy: jasmine.Spy;
  let uiLog: { error: jasmine.Spy };

  function webhook() {
    const cfg = new Settings().brew_by_weight_webhook;
    cfg.active = true;
    cfg.url = ` ${URL_WITH_KEY} `;
    cfg.authType = WEBHOOK_AUTH_TYPE_ENUM.BEARER;
    cfg.bearerToken = 'token-456';
    return cfg;
  }

  beforeEach(() => {
    uiLog = { error: jasmine.createSpy('error') };
    // The network is the boundary; the plugins of the browser build use it.
    fetchSpy = spyOn(window, 'fetch');
  });

  it('calls the address with the credentials of the settings', async () => {
    const called = new Promise<void>((resolve) =>
      fetchSpy.and.callFake(() => {
        resolve();
        return Promise.resolve(new Response('', { status: 200 }));
      }),
    );

    triggerBrewByWeightWebhook(webhook(), uiLog);
    await called;

    const [url, options] = fetchSpy.calls.mostRecent().args as [
      string,
      RequestInit,
    ];
    expect(url).toContain(URL_WITH_KEY);
    expect(new Headers(options.headers).get('Authorization')).toBe(
      'Bearer token-456',
    );
    expect(uiLog.error).not.toHaveBeenCalled();
  });

  it('logs a failure without the address', async () => {
    const failed = new Promise<void>((resolve) =>
      uiLog.error.and.callFake(() => resolve()),
    );
    fetchSpy.and.rejectWith(new TypeError(`Failed to fetch ${URL_WITH_KEY}`));

    triggerBrewByWeightWebhook(webhook(), uiLog);
    await failed;

    expect(uiLog.error.calls.allArgs()).toEqual([
      ['Brew-by-weight webhook failed', 'TypeError'],
    ]);
  });
});
