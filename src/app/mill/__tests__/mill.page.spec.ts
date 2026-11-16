import {
  ChangeDetectorRef,
  createEnvironmentInjector,
  EnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { Subject } from 'rxjs';

import { Settings } from '../../../classes/settings/settings';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIMillHelper } from '../../../services/uiMillHelper';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { MillPage } from '../mill.page';

describe('MillPage - changes of the brews', () => {
  let brewEvents: Subject<unknown>;

  beforeEach(() => {
    brewEvents = new Subject();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UIBrewStorage,
          useValue: { attachOnEvent: () => brewEvents.asObservable() },
        },
        { provide: UIMillStorage, useValue: { getAllEntries: () => [] } },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => new Settings() },
        },
        {
          provide: ChangeDetectorRef,
          useValue: { detectChanges: () => undefined },
        },
        { provide: ModalController, useValue: {} },
        { provide: UIAlert, useValue: {} },
        { provide: UIAnalytics, useValue: {} },
        { provide: UIMillHelper, useValue: {} },
      ],
    });
  });

  it('builds the list once per change, however often the page was entered', () => {
    const page = TestBed.runInInjectionContext(() => new MillPage());
    spyOn(
      page as unknown as { retriggerScroll(): void },
      'retriggerScroll',
    ).and.stub();
    const load = spyOn(page, 'loadMills').and.stub();

    page.ionViewWillEnter();
    page.ionViewWillEnter();
    page.ionViewWillEnter();
    brewEvents.next({ type: 'UPDATE' });

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('stops listening when the page is destroyed', () => {
    const injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector),
    );
    runInInjectionContext(injector, () => new MillPage());
    expect(brewEvents.observed).toBeTrue();

    injector.destroy();

    expect(brewEvents.observed).toBeFalse();
  });
});
