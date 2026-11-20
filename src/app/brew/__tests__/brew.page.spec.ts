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
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { BrewPage } from '../brew.page';

describe('BrewPage - changes of the brews', () => {
  let brewEvents: Subject<unknown>;

  beforeEach(() => {
    brewEvents = new Subject();
    const settings = new Settings();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UIBrewStorage,
          useValue: { attachOnEvent: () => brewEvents.asObservable() },
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings },
        },
        { provide: ChangeDetectorRef, useValue: {} },
        { provide: ModalController, useValue: {} },
        { provide: UIHelper, useValue: {} },
        { provide: UIBrewHelper, useValue: {} },
      ],
    });
  });

  it('builds the list once per change, however often the page was entered', () => {
    const page = TestBed.runInInjectionContext(() => new BrewPage());
    const load = spyOn(page, 'loadBrews').and.stub();

    page.ionViewWillEnter();
    page.ionViewWillEnter();
    page.ionViewWillEnter();
    load.calls.reset();
    // As the storage sends it (StorageClass.__sendEvent).
    brewEvents.next({ type: 'UPDATE', uuid: 'changed' });

    expect(load).toHaveBeenCalledTimes(1);
    expect(
      (page as unknown as { lastInteractedBrewId: string })
        .lastInteractedBrewId,
    ).toBe('changed');
  });

  it('stops listening when the page is destroyed', () => {
    const injector = createEnvironmentInjector(
      [],
      TestBed.inject(EnvironmentInjector),
    );
    runInInjectionContext(injector, () => new BrewPage());
    expect(brewEvents.observed).toBeTrue();

    injector.destroy();

    expect(brewEvents.observed).toBeFalse();
  });
});
