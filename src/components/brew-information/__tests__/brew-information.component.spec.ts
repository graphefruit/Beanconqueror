import { DecimalPipe, NgClass, NgTemplateOutlet } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';

import {
  TranslateModule,
  TranslatePipe,
  TranslateService,
} from '@ngx-translate/core';

import { Bean } from '../../../classes/bean/bean';
import { Brew, BrewInstanceHelper } from '../../../classes/brew/brew';
import { Mill } from '../../../classes/mill/mill';
import { Preparation } from '../../../classes/preparation/preparation';
import { Settings } from '../../../classes/settings/settings';
import { StorageClass } from '../../../classes/storageClass';
import { BREW_ACTION } from '../../../enums/brews/brewAction';
import { BeanFunction } from '../../../pipes/bean/beanFunction';
import { BrewFieldVisiblePipe } from '../../../pipes/brew/brewFieldVisible';
import { BrewFunction } from '../../../pipes/brew/brewFunction';
import { FormatDatePipe } from '../../../pipes/formatDate';
import { PreparationFunction } from '../../../pipes/preparation/preparationFunction';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { BrewTrackingService } from '../../../services/brewTracking/brew-tracking.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIGraphHelper } from '../../../services/uiGraphHelper';
import { UIHealthKit } from '../../../services/uiHealthKit';
import { UIHelper } from '../../../services/uiHelper';
import { UIImage } from '../../../services/uiImage';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';
import { VisualizerService } from '../../../services/visualizerService/visualizer-service.service';
import { ActionsPopoverComponent } from '../../actions-popover/actions-popover.component';
import { BrewShareComponent } from '../../brew-share/brew-share.component';
import { BrewInformationComponent } from '../brew-information.component';

describe('BrewInformationComponent', () => {
  let fixture: ComponentFixture<BrewInformationComponent>;
  let uiHelper: jasmine.SpyObj<UIHelper>;
  let settingsStorage: jasmine.SpyObj<UISettingsStorage>;
  let settings: Settings;

  beforeEach(waitForAsync(() => {
    settings = new Settings();
    uiHelper = jasmine.createSpyObj('UIHelper', [
      'openExternalWebpage',
      'copyData',
    ]);
    settingsStorage = jasmine.createSpyObj('UISettingsStorage', [
      'getSettings',
    ]);
    settingsStorage.getSettings.and.returnValue(settings);

    TestBed.overrideComponent(BrewInformationComponent, {
      set: {
        imports: [
          NgTemplateOutlet,
          NgClass,
          DecimalPipe,
          TranslatePipe,
          FormatDatePipe,
          ToFixedPipe,
          BrewFieldVisiblePipe,
          BrewFunction,
          BeanFunction,
          PreparationFunction,
        ],
        schemas: [NO_ERRORS_SCHEMA],
      },
    });

    TestBed.configureTestingModule({
      imports: [BrewInformationComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: UISettingsStorage,
          useValue: settingsStorage,
        },
        {
          provide: UIBrewHelper,
          useValue: jasmine.createSpyObj('UIBrewHelper', [
            'detailBrew',
            'editBrew',
            'rateBrew',
            'repeatBrew',
            'canBrewIfNotShowMessage',
            'cupBrew',
            'copyBrewToRepeat',
            'checkIfBeanPackageIsConsumedTriggerMessageAndArchive',
          ]),
        },
        {
          provide: UIBrewStorage,
          useValue: jasmine.createSpyObj('UIBrewStorage', [
            'update',
            'updateMany',
            'addAndConfirm',
          ]),
        },
        {
          provide: UIToast,
          useValue: jasmine.createSpyObj('UIToast', ['showInfoToast']),
        },
        {
          provide: UIAnalytics,
          useValue: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
        },
        {
          provide: UIAlert,
          useValue: jasmine.createSpyObj('UIAlert', [
            'showLoadingSpinner',
            'hideLoadingSpinner',
            'showConfirm',
            'showMessage',
          ]),
        },
        {
          provide: UIImage,
          useValue: jasmine.createSpyObj('UIImage', ['viewPhotos']),
        },
        {
          provide: ModalController,
          useValue: jasmine.createSpyObj('ModalController', ['create']),
        },
        { provide: UIHelper, useValue: uiHelper },
        {
          provide: BrewTrackingService,
          useValue: jasmine.createSpyObj('BrewTrackingService', ['trackBrew']),
        },
        {
          provide: UIHealthKit,
          useValue: jasmine.createSpyObj('UIHealthKit', [
            'trackCaffeineConsumption',
          ]),
        },
        {
          provide: Platform,
          useValue: jasmine.createSpyObj('Platform', ['is']),
        },
        {
          provide: UIFileHelper,
          useValue: jasmine.createSpyObj('UIFileHelper', [
            'readInternalJSONFile',
          ]),
        },
        {
          provide: UIBeanHelper,
          useValue: jasmine.createSpyObj('UIBeanHelper', [
            'getAllBrewsForThisBean',
          ]),
        },
        {
          provide: VisualizerService,
          useValue: jasmine.createSpyObj('VisualizerService', [
            'uploadToVisualizer',
          ]),
        },
        {
          provide: UIGraphHelper,
          useValue: jasmine.createSpyObj('UIGraphHelper', ['detailBrewGraph']),
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    BrewInstanceHelper.setEntryAmountBackToZero();
    fixture = TestBed.createComponent(BrewInformationComponent);
  });

  afterEach(() => {
    (UIBeanStorage as any).instance = undefined;
    (UIPreparationStorage as any).instance = undefined;
    (UIMillStorage as any).instance = undefined;
  });

  function render(brew: Brew): void {
    fixture.componentRef.setInput('brew', brew);
    fixture.componentRef.setInput('collapsed', false);
    fixture.detectChanges();
  }

  function makeBrew(imported?: Brew['customInformation']['imported']): Brew {
    const bean = new Bean();
    bean.config.uuid = 'bean-1';
    bean.name = 'Filter roast';

    const preparation = new Preparation();
    preparation.config.uuid = 'preparation-1';
    preparation.name = 'Pour over';

    const mill = new Mill();
    mill.config.uuid = 'mill-1';
    mill.name = 'Hand grinder';

    (UIBeanStorage as any).instance = { getByUUID: () => bean };
    (UIPreparationStorage as any).instance = { getByUUID: () => preparation };
    (UIMillStorage as any).instance = { getByUUID: () => mill };

    const brew = new Brew();
    brew.config.uuid = 'brew-1';
    brew.config.unix_timestamp = 1_800_000_000;
    brew.bean = bean.config.uuid;
    brew.method_of_preparation = preparation.config.uuid;
    brew.mill = mill.config.uuid;
    brew.grind_weight = 18;
    brew.brew_quantity = 300;
    brew.customInformation.imported = imported;

    return brew;
  }

  it('renders the sender name and device when provenance is present', () => {
    render(
      makeBrew({
        source: 'unknown-sender',
        sourceName: 'Any Sender',
        device: 'Countertop brewer',
        schema: 1,
        params: { opaque: 'do not render' },
      }),
    );

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('BREW_IMPORTED_FROM');
    expect(text).toContain('Any Sender');
    expect(text).toContain('Countertop brewer');
    expect(text).not.toContain('do not render');
  });

  it('renders without provenance as before and does not throw', () => {
    expect(() => render(makeBrew())).not.toThrow();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Filter roast');
    expect(
      fixture.nativeElement.querySelector('.brew-imported-chip'),
    ).toBeNull();
  });

  it('renders a tappable chip only when sourceUrl is present', () => {
    render(
      makeBrew({
        source: 'unknown-sender',
        sourceName: 'Any Sender',
        sourceUrl: 'https://example.com/brews/1',
        schema: 1,
      }),
    );

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="brew-imported-source-link"]',
      ),
    ).not.toBeNull();

    render(
      makeBrew({
        source: 'unknown-sender',
        sourceName: 'Any Sender',
        schema: 1,
      }),
    );

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="brew-imported-source-link"]',
      ),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="brew-imported-source-chip"]',
      ),
    ).not.toBeNull();
  });

  it('opens the sourceUrl exactly once when the tappable chip is pressed', () => {
    render(
      makeBrew({
        source: 'unknown-sender',
        sourceName: 'Any Sender',
        sourceUrl: 'https://example.com/brews/1',
        schema: 1,
      }),
    );

    fixture.nativeElement
      .querySelector('[data-testid="brew-imported-source-link"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(uiHelper.openExternalWebpage.calls.count()).toBe(1);
    expect(uiHelper.openExternalWebpage.calls.argsFor(0)).toEqual([
      'https://example.com/brews/1',
    ]);
  });

  it('renders a non-tappable chip for an unsafe stored sourceUrl', () => {
    render(
      makeBrew({
        source: 'unknown-sender',
        sourceName: 'Any Sender',
        sourceUrl: 'javascript:alert(1)//http',
        schema: 1,
      }),
    );

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="brew-imported-source-link"]',
      ),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="brew-imported-source-chip"]',
      ),
    ).not.toBeNull();
    expect(uiHelper.openExternalWebpage.calls.count()).toBe(0);
  });

  it('renders a non-tappable chip for a non-string stored sourceUrl', () => {
    expect(() =>
      render(
        makeBrew({
          source: 'unknown-sender',
          sourceName: 'Any Sender',
          sourceUrl: 42,
          schema: 1,
        } as any),
      ),
    ).not.toThrow();

    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="brew-imported-source-link"]',
      ),
    ).toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="brew-imported-source-chip"]',
      ),
    ).not.toBeNull();
  });

  it('does not render a chip when the stored sourceName is missing', () => {
    expect(() =>
      render(
        makeBrew({
          source: 'unknown-sender',
          schema: 1,
        } as any),
      ),
    ).not.toThrow();

    expect(
      fixture.nativeElement.querySelector('.brew-imported-chip'),
    ).toBeNull();
  });

  it('does not render a chip when the stored sourceName is blank', () => {
    expect(() =>
      render(
        makeBrew({
          source: 'unknown-sender',
          sourceName: '   ',
          schema: 1,
        }),
      ),
    ).not.toThrow();

    expect(
      fixture.nativeElement.querySelector('.brew-imported-chip'),
    ).toBeNull();
  });

  it('omits the device segment when the stored device is not a string', () => {
    expect(() =>
      render(
        makeBrew({
          source: 'unknown-sender',
          sourceName: 'Any Sender',
          device: { label: 'Countertop brewer' },
          schema: 1,
        } as any),
      ),
    ).not.toThrow();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Any Sender');
    expect(text).not.toContain('[object Object]');
    expect(text).not.toContain('Countertop brewer');
  });

  it('falls back to text for an unknown source', () => {
    render(
      makeBrew({
        source: 'not-in-lookup',
        sourceName: 'Unlisted Brewer App',
        schema: 1,
      }),
    );

    expect(fixture.nativeElement.textContent).toContain('Unlisted Brewer App');
  });

  it('keeps an over-long sourceName escaped inside the chip layout', () => {
    const sourceName = `<img src=x onerror=alert(1)> ${'Sender '.repeat(80)}`;

    render(
      makeBrew({
        source: 'not-in-lookup',
        sourceName,
        schema: 1,
      }),
    );

    const chip = fixture.nativeElement.querySelector('.brew-imported-chip');
    expect(chip.textContent).toContain(sourceName);
    expect(chip.querySelector('img')).toBeNull();
    expect(chip.querySelector('.brew-imported-chip-label')).not.toBeNull();
  });

  it('applies best-brew and favourite-brew classes on the card for brew layout', () => {
    const brew = makeBrew();
    brew.best_brew = true;
    brew.favourite = true;
    render(brew);

    const card = fixture.nativeElement.querySelector('ion-card.brew-layout');
    expect(card).not.toBeNull();
    expect(card.classList.contains('best-brew')).toBeTrue();
    expect(card.classList.contains('favourite-brew')).toBeTrue();
  });

  it('applies best-brew and favourite-brew classes on the card for dashboard layout', () => {
    fixture.componentRef.setInput('layout', 'dashboard');
    const brew = makeBrew();
    brew.best_brew = true;
    brew.favourite = true;
    render(brew);

    const card = fixture.nativeElement.querySelector(
      'ion-card.dashboard-layout',
    );
    expect(card).not.toBeNull();
    expect(card.classList.contains('best-brew')).toBeTrue();
    expect(card.classList.contains('favourite-brew')).toBeTrue();
  });

  describe('best brew', () => {
    type Spies = Record<string, jasmine.Spy>;
    let brewStorage: Spies;
    let alert: Spies;
    let brew: Brew;
    let formerBest: Brew;
    let ordinary: Brew;
    /** The brews as they were handed to the storage. */
    let handedOver: { uuid: string; best_brew: boolean }[];

    function sibling(uuid: string, best: boolean): Brew {
      const other = makeBrew();
      other.config.uuid = uuid;
      other.best_brew = best;
      return other;
    }

    beforeEach(() => {
      brewStorage = TestBed.inject(UIBrewStorage) as unknown as Spies;
      alert = TestBed.inject(UIAlert) as unknown as Spies;
      brew = makeBrew();
      formerBest = sibling('former-best', true);
      ordinary = sibling('ordinary', false);
      (
        TestBed.inject(UIBeanHelper) as unknown as Spies
      ).getAllBrewsForThisBean.and.returnValue([formerBest, brew, ordinary]);
      handedOver = [];
      brewStorage.updateMany.and.callFake((brews: Brew[]) => {
        handedOver = brews.map((_brew) => ({
          uuid: _brew.config.uuid,
          best_brew: _brew.best_brew,
        }));
        // What is on the screen is not changed before it is saved.
        expect(brews).not.toContain(brew);
        expect(brews).not.toContain(formerBest);
        return Promise.resolve(true);
      });
      render(brew);
    });

    it('marks the brew and takes the mark off the former best one with one save', async () => {
      await fixture.componentInstance.toggleBestBrew();

      expect(brewStorage.updateMany).toHaveBeenCalledTimes(1);
      expect(brewStorage.update).not.toHaveBeenCalled();
      expect(handedOver).toEqual([
        { uuid: 'brew-1', best_brew: true },
        { uuid: 'former-best', best_brew: false },
      ]);
      expect(brew.best_brew).toBeTrue();
      expect(formerBest.best_brew).toBeFalse();
      expect(alert.showMessage).not.toHaveBeenCalled();
    });

    it('takes the mark off again without touching other brews', async () => {
      brew.best_brew = true;
      formerBest.best_brew = false;

      await fixture.componentInstance.toggleBestBrew();

      expect(handedOver).toEqual([{ uuid: 'brew-1', best_brew: false }]);
      expect(brew.best_brew).toBeFalse();
    });

    it('leaves the marks as they are and tells the user when nothing was saved', async () => {
      brewStorage.updateMany.and.resolveTo(false);

      await fixture.componentInstance.toggleBestBrew();

      expect(brew.best_brew).toBeFalse();
      expect(formerBest.best_brew).toBeTrue();
      expect(alert.showMessage).toHaveBeenCalledOnceWith(
        'ERROR_OCCURED',
        'CARE',
        undefined,
        true,
      );
    });

    it('adds no message of its own when the storage has told the user', async () => {
      brewStorage.updateMany.and.resolveTo(false);
      spyOn(StorageClass, 'getMessagesShown').and.returnValues(3, 4);

      await fixture.componentInstance.toggleBestBrew();

      expect(brew.best_brew).toBeFalse();
      expect(alert.showMessage).not.toHaveBeenCalled();
    });
  });

  describe('fast repeat', () => {
    type Spies = Record<string, jasmine.Spy>;
    let brewHelper: Spies;
    let brewStorage: Spies;
    let alert: Spies;
    let toast: Spies;
    let tracking: Spies;

    beforeEach(() => {
      brewHelper = TestBed.inject(UIBrewHelper) as unknown as Spies;
      brewStorage = TestBed.inject(UIBrewStorage) as unknown as Spies;
      alert = TestBed.inject(UIAlert) as unknown as Spies;
      toast = TestBed.inject(UIToast) as unknown as Spies;
      tracking = TestBed.inject(BrewTrackingService) as unknown as Spies;
      brewHelper.canBrewIfNotShowMessage.and.returnValue(true);
    });

    it('stores the copy and reports the repeat', async () => {
      const copy = makeBrew();
      render(makeBrew());
      brewHelper.copyBrewToRepeat.and.returnValue(copy);
      brewStorage.addAndConfirm.and.resolveTo({ entry: copy, saved: true });

      await fixture.componentInstance.fastRepeatBrew();

      expect(brewStorage.addAndConfirm).toHaveBeenCalledOnceWith(copy);
      expect(tracking.trackBrew).toHaveBeenCalledOnceWith(copy);
      expect(toast.showInfoToast).toHaveBeenCalledOnceWith(
        'TOAST_BREW_REPEATED_SUCCESSFULLY',
      );
      expect(alert.showMessage).not.toHaveBeenCalled();
    });

    it('tells the user when bean, mill or preparation of the brew are gone and stores nothing', async () => {
      render(makeBrew());
      brewHelper.copyBrewToRepeat.and.returnValue(undefined);

      await fixture.componentInstance.fastRepeatBrew();

      expect(alert.showMessage).toHaveBeenCalledOnceWith(
        'BREW_REPEAT_MISSING_DATA',
        undefined,
        undefined,
        true,
      );
      expect(brewStorage.addAndConfirm).not.toHaveBeenCalled();
      expect(toast.showInfoToast).not.toHaveBeenCalled();
    });

    it('adds no message of its own when the storage has told the user that the repeat was not saved', async () => {
      const copy = makeBrew();
      render(makeBrew());
      brewHelper.copyBrewToRepeat.and.returnValue(copy);
      brewStorage.addAndConfirm.and.resolveTo({ entry: copy, saved: false });
      spyOn(StorageClass, 'getMessagesShown').and.returnValues(3, 4);

      await fixture.componentInstance.fastRepeatBrew();

      expect(alert.showMessage).not.toHaveBeenCalled();
      expect(tracking.trackBrew).not.toHaveBeenCalled();
      expect(toast.showInfoToast).not.toHaveBeenCalled();
    });

    it('tells the user itself when the repeat was not saved and the storage stayed silent', async () => {
      const copy = makeBrew();
      render(makeBrew());
      brewHelper.copyBrewToRepeat.and.returnValue(copy);
      brewStorage.addAndConfirm.and.resolveTo({ entry: copy, saved: false });
      // A collection that was not read reports its refused writes only once
      spyOn(StorageClass, 'getMessagesShown').and.returnValue(4);

      await fixture.componentInstance.fastRepeatBrew();

      expect(alert.showMessage).toHaveBeenCalledOnceWith(
        'ERROR_OCCURED',
        'CARE',
        undefined,
        true,
      );
      expect(tracking.trackBrew).not.toHaveBeenCalled();
      expect(toast.showInfoToast).not.toHaveBeenCalled();
    });
  });

  describe('share as image', () => {
    it('offers the picture in the menu and opens it with the brew', async () => {
      const brew = makeBrew();
      render(brew);
      (TestBed.inject(UIBrewHelper) as any).fieldVisible = () => true;
      const pick = spyOn(ActionsPopoverComponent, 'pick').and.resolveTo(
        BREW_ACTION.SHARE,
      );
      const open = spyOn(BrewShareComponent, 'open').and.resolveTo();

      await fixture.componentInstance.showBrewActions(new MouseEvent('click'));

      const share = pick.calls
        .mostRecent()
        .args[1].items.find(
          (item) =>
            item.itemType === 'action' &&
            item.role === (BREW_ACTION.SHARE as string),
        );
      expect(share).toEqual(
        jasmine.objectContaining({ translationKey: 'SHARE_CARD.MENU' }),
      );
      expect(open).toHaveBeenCalledOnceWith(jasmine.anything(), brew);
    });
  });

  describe('options and roles', () => {
    // 15 January 2027, 09:20 in the time zone the tests run in.
    const time = new Date(2027, 0, 15, 9, 20).getTime() / 1000;

    beforeEach(() => {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', {
        A11Y: {
          ARCHIVED_BREW: 'Archived brew',
          BREW_OPTIONS_FOR: 'Options for the brew of {{date}}',
          BREW_OPTIONS_FOR_BEAN: 'Options for the brew of {{date}}, {{bean}}',
        },
      });
      translate.use('en');
      settings.date_format = 'DD.MM.YYYY';
    });

    function show(brew: Brew, layout: 'brew' | 'dashboard'): HTMLElement {
      brew.config.unix_timestamp = time;
      fixture.componentRef.setInput('layout', layout);
      render(brew);
      return fixture.nativeElement as HTMLElement;
    }

    /** Ionic moves the name of ion-button to the button in its shadow root. */
    async function optionsName(card: HTMLElement): Promise<string> {
      const button = card
        .querySelector('ion-icon[name="beanconqueror-dots"]')
        .closest('ion-button');
      await new Promise((resolve) => setTimeout(resolve));
      return (
        button.shadowRoot
          ?.querySelector('button')
          ?.getAttribute('aria-label') ?? button.getAttribute('aria-label')
      );
    }

    // Brews of the same minute are told apart by their bean.
    for (const layout of ['brew', 'dashboard'] as const) {
      it(`names the options after the date and the bean of the brew (${layout})`, async () => {
        expect(await optionsName(show(makeBrew(), layout))).toBe(
          'Options for the brew of 15.01.2027 09:20, Filter roast',
        );
      });

      it(`names the options of a brew whose bean is gone by its date only (${layout})`, async () => {
        const brew = makeBrew();
        (UIBeanStorage as any).instance = { getByUUID: () => undefined };

        expect(await optionsName(show(brew, layout))).toBe(
          'Options for the brew of 15.01.2027 09:20',
        );
      });
    }

    it('is one entry on Home: a level-3 heading, no list, an archive mark but no button', () => {
      const brew = makeBrew();
      brew.getBean().finished = true;
      const card = show(brew, 'dashboard');

      const headings = card.querySelectorAll('[role="heading"]');
      expect(headings.length).toBe(1);
      expect(headings[0].getAttribute('aria-level')).toBe('3');
      expect(headings[0].textContent).toContain('Filter roast');
      expect(
        card.querySelectorAll('ion-list, [role="list"], [role="listitem"]')
          .length,
      ).toBe(0);
      // The mark sits where the options are; a tap on it reaches the card.
      expect(
        card.querySelector('ion-icon[name="beanconqueror-dots"]'),
      ).toBeNull();
      const mark = card
        .querySelector('ion-icon[name="archive"]')
        .closest('ion-button');
      expect(mark.hasAttribute('inert')).toBeTrue();
      expect(mark.hasAttribute('aria-label')).toBeFalse();
      expect(
        [...card.querySelectorAll('.visually-hidden')].map((hidden) =>
          hidden.textContent.trim(),
        ),
      ).toEqual(['Archived brew']);
    });
  });
});
