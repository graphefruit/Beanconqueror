import { DecimalPipe, KeyValuePipe } from '@angular/common';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  Input,
  NO_ERRORS_SCHEMA,
  OnDestroy,
  Output,
} from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import {
  AlertController,
  ModalController,
  Platform,
} from '@ionic/angular/standalone';

import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { Bean } from '../../../../classes/bean/bean';
import { Brew } from '../../../../classes/brew/brew';
import { Mill } from '../../../../classes/mill/mill';
import { Preparation } from '../../../../classes/preparation/preparation';
import { Settings } from '../../../../classes/settings/settings';
import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import { BrewFunction } from '../../../../pipes/brew/brewFunction';
import { FormatDatePipe } from '../../../../pipes/formatDate';
import { MillFunction } from '../../../../pipes/mill/millFunction';
import { ToFixedPipe } from '../../../../pipes/toFixed';
import { ShareService } from '../../../../services/shareService/share-service.service';
import { UIAlert } from '../../../../services/uiAlert';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UIBrewHelper } from '../../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../../services/uiBrewStorage';
import { UIExcel } from '../../../../services/uiExcel';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIHelper } from '../../../../services/uiHelper';
import { UILog } from '../../../../services/uiLog';
import { UIMillHelper } from '../../../../services/uiMillHelper';
import { UIPreparationHelper } from '../../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { createMockUISettingsStorage } from '../../../../test-utils';
import { BrewDetailComponent } from '../brew-detail.component';

/** Stands in for the graph of the flow profile and counts its instances. */
// eslint-disable-next-line @angular-eslint/component-selector -- the selector of the real graph
@Component({ selector: 'brew-brewing-graph', template: '' })
class BrewBrewingGraphStubComponent implements OnDestroy {
  public static created = 0;
  public static destroyed = 0;

  @Input() public isDetail: boolean;
  @Input() public brewComponent: BrewDetailComponent;
  @Input() public data: Brew;
  @Output() public dataChange = new EventEmitter<Brew>();

  public flow_profile_raw = { waterFlow: [], realtimeFlow: [] };

  constructor() {
    BrewBrewingGraphStubComponent.created++;
  }

  public async instance(): Promise<void> {
    // Draws the graph in the real component.
  }

  public ngOnDestroy(): void {
    BrewBrewingGraphStubComponent.destroyed++;
  }
}

/**
 * The brew details render their fields in the configured order, so screen
 * readers meet them as they are shown. Uses the real template with the
 * Ionic elements left inert.
 */
describe('BrewDetailComponent field order', () => {
  let component: BrewDetailComponent;
  let fixture: ComponentFixture<BrewDetailComponent>;
  let settings: Settings;
  let preparation: Preparation;
  let settingsEvents: Subject<unknown>;
  let preparationEvents: Subject<unknown>;
  let uiBrewHelper: jasmine.SpyObj<UIBrewHelper>;

  beforeEach(waitForAsync(() => {
    settings = new Settings();
    settings.manage_parameters.brew_temperature_time = true;
    Object.assign(settings.brew_order.before, { brew_temperature: 0 });
    Object.assign(settings.brew_order.while, { brew_temperature_time: 5 });
    preparation = new Preparation();
    preparation.style_type = PREPARATION_STYLE_TYPE.POUR_OVER;
    BrewBrewingGraphStubComponent.created = 0;
    BrewBrewingGraphStubComponent.destroyed = 0;

    settingsEvents = new Subject();
    preparationEvents = new Subject();
    const mockUISettingsStorage = createMockUISettingsStorage();
    mockUISettingsStorage.getSettings.and.returnValue(settings);
    mockUISettingsStorage.attachOnEvent.and.returnValue(settingsEvents);
    // Brews format their times with the settings of the storage instance.
    spyOn(UISettingsStorage, 'getInstance').and.returnValue(
      mockUISettingsStorage,
    );
    spyOn(Brew.prototype, 'getPreparation').and.callFake(() => preparation);
    spyOn(Brew.prototype, 'getBean').and.returnValue(new Bean());
    spyOn(Brew.prototype, 'getMill').and.returnValue(new Mill());

    const uiHelper = jasmine.createSpyObj('UIHelper', ['copyData']);
    uiHelper.copyData.and.callFake(
      (_data: Brew) => JSON.parse(JSON.stringify(_data)) as Brew,
    );
    uiBrewHelper = jasmine.createSpyObj('UIBrewHelper', {
      showSectionBeforeBrew: true,
      showSectionWhileBrew: true,
      showSectionAfterBrew: true,
      showCupping: false,
      editBrew: Promise.resolve(undefined),
    });

    TestBed.overrideComponent(BrewDetailComponent, {
      set: {
        imports: [
          BrewBrewingGraphStubComponent,
          DecimalPipe,
          KeyValuePipe,
          TranslatePipe,
          FormatDatePipe,
          ToFixedPipe,
          BrewFunction,
          MillFunction,
        ],
        schemas: [NO_ERRORS_SCHEMA],
      },
    });

    TestBed.configureTestingModule({
      imports: [BrewDetailComponent, TranslateModule.forRoot()],
      providers: [
        { provide: UISettingsStorage, useValue: mockUISettingsStorage },
        {
          provide: UIPreparationStorage,
          useValue: jasmine.createSpyObj('UIPreparationStorage', {
            attachOnEvent: preparationEvents,
          }),
        },
        { provide: UIBrewHelper, useValue: uiBrewHelper },
        { provide: UIHelper, useValue: uiHelper },
        {
          provide: UIAnalytics,
          useValue: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
        },
        {
          provide: UIExcel,
          useValue: jasmine.createSpyObj('UIExcel', ['exportBrewFlowProfile']),
        },
        {
          provide: UIBeanHelper,
          useValue: jasmine.createSpyObj('UIBeanHelper', ['detailBean']),
        },
        {
          provide: UIPreparationHelper,
          useValue: jasmine.createSpyObj('UIPreparationHelper', [
            'detailPreparation',
          ]),
        },
        {
          provide: UIMillHelper,
          useValue: jasmine.createSpyObj('UIMillHelper', ['detailMill']),
        },
        {
          provide: UIFileHelper,
          useValue: jasmine.createSpyObj('UIFileHelper', [
            'readInternalJSONFile',
          ]),
        },
        {
          provide: UIAlert,
          useValue: jasmine.createSpyObj('UIAlert', ['showMessage']),
        },
        {
          provide: UILog,
          useValue: jasmine.createSpyObj('UILog', ['log', 'error']),
        },
        {
          provide: ShareService,
          useValue: jasmine.createSpyObj('ShareService', ['shareFile']),
        },
        {
          provide: UIBrewStorage,
          useValue: jasmine.createSpyObj('UIBrewStorage', ['update']),
        },
        {
          provide: ModalController,
          useValue: jasmine.createSpyObj('ModalController', [
            'create',
            'dismiss',
          ]),
        },
        {
          provide: AlertController,
          useValue: jasmine.createSpyObj('AlertController', ['create']),
        },
        {
          provide: Platform,
          useValue: jasmine.createSpyObj('Platform', ['is']),
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(async () => {
    fixture = TestBed.createComponent(BrewDetailComponent);
    component = fixture.componentInstance;
    const brew = new Brew();
    brew.flow_profile = 'brews/brew_flow_profile.json';
    component.brew = brew;
    await component.ionViewDidEnter();
    fixture.detectChanges();
  });

  /** The labels of the rows of a section, in the order of the markup. */
  function labels(_title: string): string[] {
    const cards: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('ion-card.popover'),
    );
    const card = cards.find((element) =>
      element.querySelector('.ion-title')?.textContent.includes(_title),
    );
    return Array.from(card.children)
      .filter(
        (row) =>
          !row.querySelector('.ion-title') &&
          !row.classList.contains('last-item'),
      )
      .map(
        (row) =>
          row.querySelector('h2')?.textContent.trim() ??
          row.tagName.toLowerCase(),
      );
  }

  function graph(): BrewBrewingGraphStubComponent {
    return fixture.debugElement.query(
      By.directive(BrewBrewingGraphStubComponent),
    ).componentInstance as BrewBrewingGraphStubComponent;
  }

  it('renders the fields in the configured order, the creation date last', () => {
    expect(labels('BREW_HEADER_BEFORE_BREW')).toEqual([
      'BREW_DATA_BREW_TEMPERATURE:',
      'BREW_DATA_BEAN_TYPE:',
      'BREW_INFORMATION_BREW_RATIO:',
      'BREW_DATA_GRIND_WEIGHT:',
      'BREW_DATA_MILL:',
      'BREW_DATA_GRIND_SIZE:',
      'BREW_DATA_PREPARATION_METHOD:',
    ]);
    // The flow profile summary and the graph take the place of the brew time.
    expect(labels('BREW_HEADER_WHILE_BREW')).toEqual([
      'ion-item',
      'brew-brewing-graph',
      'BREW_DATA_TIME:',
      'BREW_DATA_COFFEE_BLOOMING_TIME:',
      'BREW_DATA_TEMPERATURE_TIME / BREW_DATA_SURF_TIME:',
    ]);
    expect(labels('BREW_HEADER_AFTER_BREW')).toEqual([
      'BREW_DATA_BREW_QUANTITY:',
      'BREW_DATA_BREW_BEVERAGE_QUANTITY:',
      'BREW_DATA_RATING:',
      'BREW_DATA_NOTES:',
      'BREW_CREATION_DATE',
    ]);
    expect(component.brewBrewingGraphEl).toBe(graph() as any);
  });

  it('keeps the graph when the settings change while the details are open', () => {
    const graphBefore = graph();

    settings.brew_order.while.brew_temperature_time = 0;
    settings.manage_parameters.coffee_blooming_time = false;
    settingsEvents.next({ type: 'UPDATE' });
    fixture.detectChanges();

    expect(labels('BREW_HEADER_WHILE_BREW')).toEqual([
      'BREW_DATA_TEMPERATURE_TIME / BREW_DATA_SURF_TIME:',
      'ion-item',
      'brew-brewing-graph',
      'BREW_DATA_TIME:',
    ]);
    expect(graph()).toBe(graphBefore);
    expect(BrewBrewingGraphStubComponent.created).toBe(1);
    expect(BrewBrewingGraphStubComponent.destroyed).toBe(0);
  });

  it('lays out the fields again when the preparation is saved', () => {
    preparation.use_custom_parameters = true;
    preparation.manage_parameters.brew_temperature = false;
    preparationEvents.next({ type: 'UPDATE' });
    fixture.detectChanges();

    expect(labels('BREW_HEADER_BEFORE_BREW')).not.toContain(
      'BREW_DATA_BREW_TEMPERATURE:',
    );
  });

  it('lays out the fields of the preparation of an edited brew', async () => {
    const espresso = new Preparation();
    espresso.style_type = PREPARATION_STYLE_TYPE.ESPRESSO;
    uiBrewHelper.editBrew.and.callFake(() => {
      preparation = espresso;
      return Promise.resolve(new Brew());
    });

    await component.edit();
    fixture.detectChanges();

    // Espresso has no amount of water.
    expect(labels('BREW_HEADER_AFTER_BREW')).not.toContain(
      'BREW_DATA_BREW_QUANTITY:',
    );
    expect(labels('BREW_HEADER_WHILE_BREW')).toContain(
      'BREW_DATA_COFFEE_FIRST_DRIP_TIME:',
    );
  });
});
