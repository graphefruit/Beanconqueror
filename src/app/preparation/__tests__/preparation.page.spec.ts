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
import { PreparationSortFilterHelperService } from '../../../services/preparationSortFilterHelper/preparation-sort-filter-helper.service';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { PreparationPage } from '../preparation.page';

describe('PreparationPage - changes of the brews and the methods', () => {
  let brewEvents: Subject<unknown>;
  let preparationEvents: Subject<unknown>;

  beforeEach(() => {
    brewEvents = new Subject();
    preparationEvents = new Subject();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UIBrewStorage,
          useValue: { attachOnEvent: () => brewEvents.asObservable() },
        },
        {
          provide: UIPreparationStorage,
          useValue: {
            attachOnEvent: () => preparationEvents.asObservable(),
            getAllEntries: () => [],
          },
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => new Settings() },
        },
        {
          provide: PreparationSortFilterHelperService,
          useValue: { initializePreparationsView: () => [] },
        },
        {
          provide: ChangeDetectorRef,
          useValue: { detectChanges: () => undefined },
        },
        { provide: ModalController, useValue: {} },
        { provide: UIPreparationHelper, useValue: {} },
      ],
    });
  });

  it('builds the list once per change, however often the page was entered', () => {
    const page = TestBed.runInInjectionContext(() => new PreparationPage());
    spyOn(
      page as unknown as { retriggerScroll(): void },
      'retriggerScroll',
    ).and.stub();
    const load = spyOn(page, 'loadPreparations').and.stub();

    page.ionViewWillEnter();
    page.ionViewWillEnter();
    page.ionViewWillEnter();
    brewEvents.next({ type: 'UPDATE' });
    expect(load).toHaveBeenCalledTimes(1);

    preparationEvents.next({ type: 'DELETE' });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('stops listening when the page is destroyed', () => {
    const injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector),
    );
    runInInjectionContext(injector, () => new PreparationPage());
    expect(brewEvents.observed).toBeTrue();
    expect(preparationEvents.observed).toBeTrue();

    injector.destroy();

    expect(brewEvents.observed).toBeFalse();
    expect(preparationEvents.observed).toBeFalse();
  });
});
