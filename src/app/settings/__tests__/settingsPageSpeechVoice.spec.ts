import { Injector, runInInjectionContext } from '@angular/core';

import { environment } from '../../../environments/environment';
import { SettingsPage } from '../settings.page';

/** Answers every call and property with itself, so the page can be built without its services. */
function anything(): unknown {
  const stub: unknown = new Proxy(() => stub, {
    get: (_target, key) =>
      key === 'then' ? (_resolve: () => void) => _resolve() : stub,
  });
  return stub;
}

function createPage(): SettingsPage {
  const injector = { get: () => anything() } as unknown as Injector;
  return runInInjectionContext(injector, () => new SettingsPage());
}

describe('SettingsPage pitch and rate', () => {
  const production = environment.production;

  afterEach(() => {
    environment.production = production;
  });

  it('are offered in a development build', () => {
    environment.production = false;

    expect(createPage().isSpeechVoiceAdjustable).toBeTrue();
  });

  it('are left to the device in a store build', () => {
    environment.production = true;

    expect(createPage().isSpeechVoiceAdjustable).toBeFalse();
  });
});
