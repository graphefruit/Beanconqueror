import { Brew } from '../../../classes/brew/brew';
import { SettingsPage } from '../settings.page';

describe('SettingsPage standard mill after an import', () => {
  function pageWith(brews: Brew[], mills: unknown[]) {
    const uiBrewStorage = {
      getAllEntries: () => brews,
      update: jasmine.createSpy('update').and.resolveTo(true),
    };
    const uiMillStorage = {
      getAllEntries: () => mills,
      add: jasmine
        .createSpy('add')
        .and.callFake(async (entry: unknown) => structuredClone(entry)),
    };
    // Only the two storages are needed; the page itself is not rendered.
    const page = Object.create(SettingsPage.prototype);
    page.uiBrewStorage = uiBrewStorage;
    page.uiMillStorage = uiMillStorage;
    return { page, uiBrewStorage, uiMillStorage };
  }

  it('points imported brews at the mill without touching their change info', async () => {
    const brews = [new Brew(), new Brew()];
    const { page, uiBrewStorage, uiMillStorage } = pageWith(brews, []);

    await page.__addStandardMillAfterImport();

    expect(uiMillStorage.add).toHaveBeenCalledTimes(1);
    expect(uiBrewStorage.update).toHaveBeenCalledTimes(2);
    for (const args of uiBrewStorage.update.calls.allArgs()) {
      expect(args[1]).toEqual({ touch: false });
    }
  });

  it('leaves brews alone when mills already exist', async () => {
    const { page, uiBrewStorage, uiMillStorage } = pageWith([new Brew()], [{}]);

    await page.__addStandardMillAfterImport();

    expect(uiMillStorage.add).not.toHaveBeenCalled();
    expect(uiBrewStorage.update).not.toHaveBeenCalled();
  });
});
