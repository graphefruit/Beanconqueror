import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { TranslateModule } from '@ngx-translate/core';

import { Settings } from '../../../../classes/settings/settings';
import { BEAN_SORT_AFTER } from '../../../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../../../enums/beans/beanSortOrder';
import { ISettings } from '../../../../interfaces/settings/iSettings';
import { SettingsStore } from '../../../../stores/settings/settings.store';
import { BeanSortComponent } from '../bean-sort.component';

describe('BeanSortComponent', () => {
  let settings: ReturnType<typeof signal<ISettings>>;

  beforeEach(() => {
    settings = signal(new Settings());
    TestBed.configureTestingModule({
      imports: [BeanSortComponent, TranslateModule.forRoot()],
      providers: [
        provideZonelessChangeDetection(),
        { provide: SettingsStore, useValue: { settings } },
        { provide: ModalController, useValue: {} },
      ],
    });
  });

  async function labels(): Promise<string[]> {
    const fixture = TestBed.createComponent(BeanSortComponent);
    fixture.componentInstance.bean_sort = {
      sort_order: BEAN_SORT_ORDER.UNKOWN,
      sort_after: BEAN_SORT_AFTER.UNKOWN,
    };
    // The dates are among the further sorts.
    fixture.componentInstance.extendedSortActive = true;
    await fixture.whenStable();
    return [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('ion-label'),
    ].map((label) => label.textContent.trim());
  }

  function withDates(buyDate: boolean, openDate: boolean, bestDate: boolean) {
    const next = new Settings();
    Object.assign(next.bean_manage_parameters, { buyDate, openDate, bestDate });
    settings.set(next);
  }

  it('offers sorting by the dates the bean form asks for', async () => {
    withDates(true, false, true);

    const shown = await labels();

    expect(shown).toContain('BEAN_DATA_BUY_DATE');
    expect(shown).not.toContain('BEAN_DATA_OPEN_DATE');
    expect(shown).toContain('BEAN_DATA_BEST_DATE');
  });

  it('offers no date the bean form does not ask for', async () => {
    withDates(false, true, false);

    const shown = await labels();

    expect(shown).not.toContain('BEAN_DATA_BUY_DATE');
    expect(shown).toContain('BEAN_DATA_OPEN_DATE');
    expect(shown).not.toContain('BEAN_DATA_BEST_DATE');
  });
});
