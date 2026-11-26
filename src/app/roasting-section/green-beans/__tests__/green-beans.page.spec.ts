import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { Settings } from '../../../../classes/settings/settings';
import { BEAN_SORT_AFTER } from '../../../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../../../enums/beans/beanSortOrder';
import { IBeanPageSort } from '../../../../interfaces/bean/iBeanPageSort';
import { UIAlert } from '../../../../services/uiAlert';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIBrewStorage } from '../../../../services/uiBrewStorage';
import { UIGreenBeanHelper } from '../../../../services/uiGreenBeanHelper';
import { UIGreenBeanStorage } from '../../../../services/uiGreenBeanStorage';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { GreenBeansPage } from '../green-beans.page';

describe('GreenBeansPage - sort', () => {
  const byName: IBeanPageSort = {
    sort_after: BEAN_SORT_AFTER.NAME,
    sort_order: BEAN_SORT_ORDER.ASCENDING,
  };
  let settings: Settings;
  let saveSettings: jasmine.Spy;
  let dismissedWith: unknown;

  beforeEach(() => {
    settings = new Settings();
    settings.green_bean_sort.OPEN = { ...byName };
    saveSettings = jasmine.createSpy('saveSettings').and.resolveTo();
    const modal = {
      present: () => Promise.resolve(),
      onWillDismiss: () => Promise.resolve(dismissedWith),
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ModalController,
          useValue: { create: () => Promise.resolve(modal) },
        },
        {
          provide: ChangeDetectorRef,
          useValue: { detectChanges: jasmine.createSpy() },
        },
        { provide: UIGreenBeanStorage, useValue: { getAllEntries: () => [] } },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings, saveSettings },
        },
        { provide: UIAlert, useValue: {} },
        { provide: UIBrewStorage, useValue: {} },
        { provide: UIAnalytics, useValue: {} },
        { provide: UIGreenBeanHelper, useValue: {} },
      ],
    });
  });

  function enterPage(): GreenBeansPage {
    const page = TestBed.runInInjectionContext(() => new GreenBeansPage());
    page.ionViewWillEnter();
    return page;
  }

  // Swiping the sheet away closes it without data.
  it('keeps the sort when the sort sheet is closed without a choice', async () => {
    dismissedWith = { data: undefined, role: 'gesture' };
    const page = enterPage();

    await page.showFilter();

    expect(page.openBeansFilter).toEqual(byName);
    expect(settings.green_bean_sort.OPEN).toEqual(byName);
    expect(saveSettings).toHaveBeenCalled();
  });

  it('keeps the sort when the sort sheet is closed with nothing at all', async () => {
    dismissedWith = undefined;
    const page = enterPage();

    await page.showFilter();

    expect(page.openBeansFilter).toEqual(byName);
  });

  it('takes the sort chosen in the sheet', async () => {
    const chosen: IBeanPageSort = {
      sort_after: BEAN_SORT_AFTER.ROASTING_DATE,
      sort_order: BEAN_SORT_ORDER.DESCENDING,
    };
    dismissedWith = { data: { bean_filter: chosen } };
    const page = enterPage();

    await page.showFilter();

    expect(page.openBeansFilter).toEqual(chosen);
    expect(settings.green_bean_sort.OPEN).toEqual(chosen);
  });
});
