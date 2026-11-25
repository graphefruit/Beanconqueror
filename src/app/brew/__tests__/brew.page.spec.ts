import {
  ChangeDetectorRef,
  createEnvironmentInjector,
  EnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { Subject } from 'rxjs';

import { Brew } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { BrewPage } from '../brew.page';

describe('BrewPage - changes of the brews', () => {
  let brewEvents: Subject<unknown>;
  let brews: Brew[];

  beforeEach(() => {
    brewEvents = new Subject();
    brews = [];
    const settings = new Settings();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: UIBrewStorage,
          useValue: {
            attachOnEvent: () => brewEvents.asObservable(),
            getAllEntries: () => brews,
          },
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings },
        },
        {
          provide: ChangeDetectorRef,
          useValue: { detectChanges: jasmine.createSpy() },
        },
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

  // The list tells screen readers its size (VirtualListComponent): the
  // number the segment shows.
  it('lists as many brews as the current segment counts', () => {
    const brew = (uuid: string, time: number, finishedBean: boolean) =>
      ({
        config: { uuid, unix_timestamp: time },
        rating: 0,
        getBean: () => ({ finished: finishedBean }),
        getMill: () => ({ finished: false }),
        getPreparation: () => ({ finished: false }),
      }) as unknown as Brew;
    brews = [brew('a', 1, false), brew('b', 2, true), brew('c', 3, false)];
    const page = TestBed.runInInjectionContext(() => new BrewPage());

    page.ionViewWillEnter();

    // Latest first, as the default sort says.
    expect(page.shownBrews.map((shown) => shown.config.uuid)).toEqual([
      'c',
      'a',
    ]);
    expect(page.openBrewsView).toBe(page.shownBrews);
    expect(page.openBrewsLength).toBe(page.shownBrews.length);
  });
});
