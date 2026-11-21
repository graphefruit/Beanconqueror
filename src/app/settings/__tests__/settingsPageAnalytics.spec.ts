import { CheckboxCustomEvent } from '@ionic/angular';

import { SettingsPage } from '../settings.page';

describe('SettingsPage analytics checkbox', () => {
  function tap(_stored: boolean | undefined) {
    // Only the handler is needed; the page itself is not rendered.
    const page = Object.create(SettingsPage.prototype) as SettingsPage;
    page.settings = { matomo_analytics: _stored } as SettingsPage['settings'];
    const ask = spyOn(page, 'showAnalyticsInformation').and.resolveTo();
    const save = spyOn(page, 'saveSettings').and.resolveTo();
    // Ionic has already switched the checkbox when it reports the change.
    const checkbox = { checked: _stored !== true };
    const done = page.askAboutAnalytics({
      target: checkbox,
    } as unknown as CheckboxCustomEvent);
    return { done, checkbox, ask, save, page };
  }

  for (const stored of [false, true, undefined]) {
    it(`only asks and keeps the checkbox as stored (${stored})`, async () => {
      const { done, checkbox, ask, save, page } = tap(stored);
      await done;

      expect(checkbox.checked).toBe(stored === true);
      expect(ask).toHaveBeenCalledTimes(1);
      expect(save).not.toHaveBeenCalled();
      expect(page.settings.matomo_analytics).toBe(stored);
    });
  }
});
