import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  createEnvironmentInjector,
  EnvironmentInjector,
  input,
  runInInjectionContext,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ModalController } from '@ionic/angular';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import de from '../../../assets/i18n/de.json';
import en from '../../../assets/i18n/en.json';
import { Brew } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';
import { BrewInformationComponent } from '../../../components/brew-information/brew-information.component';
import { BREW_SORT_AFTER } from '../../../enums/brews/brewSortAfter';
import { BREW_SORT_ORDER } from '../../../enums/brews/brewSortOrder';
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

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- the selector of the real card
  selector: 'brew-information',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
class BrewCardStubComponent {
  readonly brew = input<Brew>();
  readonly collapsed = input(false);
}

describe('BrewPage - the buttons above the list', () => {
  let settings: Settings;
  let showSort: jasmine.Spy;
  let saveSettings: jasmine.Spy;

  beforeEach(() => {
    settings = new Settings();
    showSort = jasmine.createSpy('showSort');
    saveSettings = jasmine.createSpy('saveSettings').and.resolveTo();
    const brew = {
      config: { uuid: 'a', unix_timestamp: 1 },
      rating: 0,
      getBean: () => ({ finished: false }),
      getMill: () => ({ finished: false }),
      getPreparation: () => ({ finished: false }),
    } as unknown as Brew;
    TestBed.overrideComponent(BrewPage, {
      remove: { imports: [BrewInformationComponent] },
      add: { imports: [BrewCardStubComponent] },
    });
    TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: UIBrewStorage,
          useValue: {
            attachOnEvent: () => new Subject(),
            getAllEntries: () => [brew],
          },
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings, saveSettings },
        },
        { provide: UIBrewHelper, useValue: { showSort } },
        { provide: ModalController, useValue: {} },
        { provide: UIHelper, useValue: {} },
      ],
    });
  });

  function useLanguage(language: 'en' | 'de'): void {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation(language, language === 'en' ? en : de);
    translate.use(language);
  }

  function render() {
    const fixture = TestBed.createComponent(BrewPage);
    fixture.componentInstance.ionViewWillEnter();
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    const toolbar = () => [
      ...page.querySelectorAll<HTMLElement>('.list-head ion-button'),
    ];
    return { fixture, page, toolbar };
  }

  const names = (buttons: HTMLElement[]) =>
    buttons.map((button) => button.getAttribute('aria-label'));

  it('names its buttons and tells whether the list is collapsed', () => {
    useLanguage('en');
    const { fixture, toolbar } = render();

    expect(names(toolbar())).toEqual([
      'Filter brews',
      'Sort brews',
      'Collapse brew list items',
    ]);
    const collapse = () => toolbar()[2];
    expect(collapse().getAttribute('aria-pressed')).toBe('false');
    collapse().click();
    fixture.detectChanges();
    expect(collapse().getAttribute('aria-pressed')).toBe('true');
    expect(settings.brew_collapsed.OPEN).toBeTrue();
    collapse().click();
    fixture.detectChanges();
    expect(collapse().getAttribute('aria-pressed')).toBe('false');
  });

  // The icon shows an active sort order; the name says it, too.
  it('names the sort button active once another order is chosen', async () => {
    useLanguage('en');
    showSort.and.resolveTo({
      sort_after: BREW_SORT_AFTER.BEAN_NAME,
      sort_order: BREW_SORT_ORDER.DESCENDING,
    });
    const { fixture, toolbar } = render();

    toolbar()[1].click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(names(toolbar())[1]).toBe('Sort brews (active)');
    expect(saveSettings).toHaveBeenCalled();
  });

  it('names its buttons in German', () => {
    useLanguage('de');
    const { toolbar } = render();

    expect(names(toolbar())).toEqual([
      'Brühungen filtern',
      'Brühungen sortieren',
      'Einträge der Brühliste einklappen',
    ]);
    expect(toolbar()[2].getAttribute('aria-pressed')).toBe('false');
  });
});
