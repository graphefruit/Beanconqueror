import { DecimalPipe, NgClass, NgTemplateOutlet } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import {
  MenuController,
  ModalController,
  Platform,
} from '@ionic/angular/standalone';

import { TranslateModule, TranslatePipe } from '@ngx-translate/core';

import { Bean } from '../../../classes/bean/bean';
import { Brew, BrewInstanceHelper } from '../../../classes/brew/brew';
import { Mill } from '../../../classes/mill/mill';
import { Preparation } from '../../../classes/preparation/preparation';
import { Settings } from '../../../classes/settings/settings';
import { BeanFunction } from '../../../pipes/bean/beanFunction';
import { BrewFieldVisiblePipe } from '../../../pipes/brew/brewFieldVisible';
import { BrewFunction } from '../../../pipes/brew/brewFunction';
import { FormatDatePipe } from '../../../pipes/formatDate';
import { PreparationFunction } from '../../../pipes/preparation/preparationFunction';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { BrewTrackingService } from '../../../services/brewTracking/brew-tracking.service';
import { ShareService } from '../../../services/shareService/share-service.service';
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
import { BrewInformationComponent } from '../brew-information.component';

describe('BrewInformationComponent imported provenance', () => {
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
          ]),
        },
        {
          provide: UIBrewStorage,
          useValue: jasmine.createSpyObj('UIBrewStorage', ['update']),
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
          provide: ShareService,
          useValue: jasmine.createSpyObj('ShareService', ['shareImage']),
        },
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
        {
          provide: MenuController,
          useValue: jasmine.createSpyObj('MenuController', ['swipeGesture']),
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
});
