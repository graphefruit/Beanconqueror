import { NgTemplateOutlet } from '@angular/common';
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
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import {
  IonBadge,
  IonButton,
  IonCard,
  IonCol,
  IonGrid,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonRange,
  IonRow,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  ModalController,
  Platform,
} from '@ionic/angular/standalone';

import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import moment from 'moment';
import { EMPTY, Subject } from 'rxjs';

import { Brew } from '../../../../classes/brew/brew';
import { Preparation } from '../../../../classes/preparation/preparation';
import { Settings } from '../../../../classes/settings/settings';
import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import { BrewFunction } from '../../../../pipes/brew/brewFunction';
import { KeysPipe } from '../../../../pipes/keys';
import { MillFunction } from '../../../../pipes/mill/millFunction';
import { ToFixedPipe } from '../../../../pipes/toFixed';
import { CoffeeBluetoothDevicesService } from '../../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { HapticService } from '../../../../services/hapticService/haptic.service';
import { EventQueueService } from '../../../../services/queueService/queue-service.service';
import { TextToSpeechService } from '../../../../services/textToSpeech/text-to-speech.service';
import { UIAlert } from '../../../../services/uiAlert';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIBeanStorage } from '../../../../services/uiBeanStorage';
import { UIBrewHelper } from '../../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../../services/uiBrewStorage';
import { UIExcel } from '../../../../services/uiExcel';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIHelper } from '../../../../services/uiHelper';
import { UILog } from '../../../../services/uiLog';
import { UIMillStorage } from '../../../../services/uiMillStorage';
import { UIPreparationHelper } from '../../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { UIToast } from '../../../../services/uiToast';
import { UIWaterStorage } from '../../../../services/uiWaterStorage';
import { createMockUISettingsStorage } from '../../../../test-utils';
import { TimerComponent } from '../../../timer/timer.component';
import { BrewBrewingComponent } from '../brew-brewing.component';

/**
 * The brew graph runs the brew with connected devices (scale, pressure,
 * brew by weight). This stand-in counts how often it is created and
 * destroyed, and offers what the section header reads from it.
 */
// eslint-disable-next-line @angular-eslint/component-selector -- the selector of the real graph
@Component({ selector: 'brew-brewing-graph', template: '' })
class BrewBrewingGraphStubComponent implements OnDestroy {
  public static created = 0;
  public static destroyed = 0;

  @Input() public isEdit: boolean;
  @Input() public brewComponent: BrewBrewingComponent;
  @Input() public data: Brew;
  @Output() public dataChange = new EventEmitter<Brew>();

  public uiSmartScaleConnected = false;
  public flow_profile_raw = {
    weight: [],
    pressureFlow: [],
    temperatureFlow: [],
  };

  constructor() {
    BrewBrewingGraphStubComponent.created++;
  }

  public shallFlowProfileBeHidden(): boolean {
    return true;
  }

  public ngOnDestroy(): void {
    BrewBrewingGraphStubComponent.destroyed++;
  }
}

/**
 * The brew form renders its fields in the configured order, so screen
 * readers and the Tab key meet them as they are shown. Uses the real
 * template with the real timers of the stored times; the brew timer and
 * other child components stay inert custom elements, the graph is a
 * stand-in that counts its instances.
 */
describe('BrewBrewingComponent field order', () => {
  let component: BrewBrewingComponent;
  let fixture: ComponentFixture<BrewBrewingComponent>;
  let settings: Settings;
  let brew: Brew;
  let preparation: Preparation;
  let settingsEvents: Subject<unknown>;
  let preparationEvents: Subject<unknown>;

  beforeEach(waitForAsync(() => {
    settings = new Settings();
    for (const key of Object.keys(settings.manage_parameters)) {
      (settings.manage_parameters as any)[key] = false;
    }
    settings.manage_parameters.brew_temperature_time = true;
    settings.manage_parameters.brew_time = true;
    settings.manage_parameters.coffee_blooming_time = true;
    Object.assign(settings.brew_order.while, {
      brew_temperature_time: 1,
      brew_time: 2,
      coffee_blooming_time: 3,
    });
    BrewBrewingGraphStubComponent.created = 0;
    BrewBrewingGraphStubComponent.destroyed = 0;

    settingsEvents = new Subject();
    preparationEvents = new Subject();
    const mockUISettingsStorage = createMockUISettingsStorage();
    mockUISettingsStorage.getSettings.and.returnValue(settings);
    mockUISettingsStorage.attachOnEvent.and.returnValue(settingsEvents);

    TestBed.overrideComponent(BrewBrewingComponent, {
      set: {
        imports: [
          FormsModule,
          NgTemplateOutlet,
          BrewBrewingGraphStubComponent,
          TimerComponent,
          IonBadge,
          IonButton,
          IonCard,
          IonCol,
          IonGrid,
          IonIcon,
          IonInput,
          IonItem,
          IonLabel,
          IonList,
          IonRange,
          IonRow,
          IonSelect,
          IonSelectOption,
          IonTextarea,
          TranslatePipe,
          KeysPipe,
          ToFixedPipe,
          BrewFunction,
          MillFunction,
        ],
        schemas: [NO_ERRORS_SCHEMA],
      },
    });

    TestBed.configureTestingModule({
      imports: [BrewBrewingComponent, TranslateModule.forRoot()],
      providers: [
        { provide: UISettingsStorage, useValue: mockUISettingsStorage },
        {
          provide: UIPreparationStorage,
          useValue: jasmine.createSpyObj('UIPreparationStorage', {
            getAllEntries: [],
            attachOnEvent: preparationEvents,
          }),
        },
        {
          provide: UIBrewHelper,
          useValue: jasmine.createSpyObj('UIBrewHelper', ['fieldVisible']),
        },
        {
          provide: UIBrewStorage,
          useValue: jasmine.createSpyObj('UIBrewStorage', ['getAllEntries']),
        },
        {
          provide: UIMillStorage,
          useValue: jasmine.createSpyObj('UIMillStorage', ['getAllEntries']),
        },
        {
          provide: UIBeanStorage,
          useValue: jasmine.createSpyObj('UIBeanStorage', ['getAllEntries']),
        },
        {
          provide: UIWaterStorage,
          useValue: jasmine.createSpyObj('UIWaterStorage', ['getAllEntries']),
        },
        {
          provide: UIHelper,
          useValue: jasmine.createSpyObj('UIHelper', ['copyData']),
        },
        {
          provide: UIAnalytics,
          useValue: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
        },
        {
          provide: UIExcel,
          useValue: jasmine.createSpyObj('UIExcel', ['exportBrewFlowProfile']),
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
          provide: UIPreparationHelper,
          useValue: jasmine.createSpyObj('UIPreparationHelper', [
            'detailPreparation',
          ]),
        },
        {
          provide: UIToast,
          useValue: jasmine.createSpyObj('UIToast', ['showInfoToast']),
        },
        {
          provide: UILog,
          useValue: jasmine.createSpyObj('UILog', ['log', 'error']),
        },
        {
          provide: CoffeeBluetoothDevicesService,
          useValue: jasmine.createSpyObj('CoffeeBluetoothDevicesService', {
            attachOnEvent: EMPTY,
          }),
        },
        {
          provide: EventQueueService,
          useValue: jasmine.createSpyObj('EventQueueService', ['dispatch']),
        },
        {
          provide: HapticService,
          useValue: jasmine.createSpyObj('HapticService', ['vibrate']),
        },
        {
          provide: TextToSpeechService,
          useValue: jasmine.createSpyObj('TextToSpeechService', ['speak']),
        },
        {
          provide: ModalController,
          useValue: jasmine.createSpyObj('ModalController', [
            'create',
            'dismiss',
          ]),
        },
        {
          provide: Platform,
          useValue: jasmine.createSpyObj('Platform', ['is']),
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    // ngAfterViewInit loads the last brew and connects devices; the field
    // order does not depend on it.
    spyOn(BrewBrewingComponent.prototype, 'ngAfterViewInit').and.stub();
    fixture = TestBed.createComponent(BrewBrewingComponent);
    component = fixture.componentInstance;
    // The sections are shown or hidden by the tests themselves.
    spyOn(component, 'setUIParams').and.stub();

    brew = new Brew();
    preparation = new Preparation();
    preparation.style_type = PREPARATION_STYLE_TYPE.POUR_OVER;
    spyOn(brew, 'getPreparation').and.callFake(() => preparation);
    component.data = brew;
    component.uiShowSectionBeforeBrew = false;
    component.uiShowSectionWhileBrew = true;
    component.uiShowSectionAfterBrew = false;
    fixture.detectChanges();
  });

  /** The card of a section, by its title. */
  function card(_title: string): HTMLElement {
    const cards: HTMLElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('ion-card'),
    );
    return cards.find((element) =>
      element.querySelector('.ion-title')?.textContent.includes(_title),
    );
  }

  /** The rows of a section in the order of the markup. */
  function rows(_title: string): Element[] {
    return Array.from(card(_title).children).filter(
      (row) =>
        !row.querySelector('.ion-title') &&
        !row.classList.contains('last-item'),
    );
  }

  /** The label of the field in each row, or the tag of a row without one. */
  function labels(_title: string): string[] {
    return rows(_title).map((row) => {
      // A timer labels the input it renders.
      const field = row.querySelector<Element & { label?: string }>(
        'ion-input, ion-select, brew-timer',
      );
      return field?.label ?? row.tagName.toLowerCase();
    });
  }

  function graph(): BrewBrewingGraphStubComponent {
    return fixture.debugElement.query(
      By.directive(BrewBrewingGraphStubComponent),
    ).componentInstance as BrewBrewingGraphStubComponent;
  }

  /**
   * The timers that show a time stored with the brew, each with a time of
   * its own so none can stand in for another.
   */
  const STORED_TIMERS = [
    {
      name: 'temperature time',
      parameter: 'brew_temperature_time',
      label: 'BREW_DATA_TEMPERATURE_TIME',
      seconds: 95,
      milliseconds: 120,
      shown: '01:35.120',
      timer: () => component.brewTemperatureTime,
    },
    {
      name: 'bloom time',
      parameter: 'coffee_blooming_time',
      label: 'BREW_DATA_COFFEE_BLOOMING_TIME',
      seconds: 30,
      milliseconds: 250,
      shown: '00:30.250',
      timer: () => component.brewCoffeeBloomingTime,
    },
    {
      name: 'first drip time',
      parameter: 'coffee_first_drip_time',
      label: 'BREW_DATA_COFFEE_FIRST_DRIP_TIME',
      seconds: 8,
      milliseconds: 5,
      shown: '00:08.005',
      timer: () => component.brewFirstDripTime,
    },
  ] as const;
  type StoredTimer = (typeof STORED_TIMERS)[number];

  /** An espresso method shows the first drip time besides the other two. */
  function chooseEspressoMethod(): void {
    settings.manage_parameters.coffee_first_drip_time = true;
    preparation.style_type = PREPARATION_STYLE_TYPE.ESPRESSO;
    component.setChoosenPreparation();
    fixture.detectChanges();
  }

  /**
   * Stores a time for each of the three timers, as the form does with the
   * times of the last brew or of a brew that is edited.
   */
  function storeTimes(): void {
    for (const stored of STORED_TIMERS) {
      brew[stored.parameter] = stored.seconds;
      brew[`${stored.parameter}_milliseconds` as const] = stored.milliseconds;
    }
  }

  /** Sorts a timer before or after the graph, as saved in the settings. */
  function sortToSideOfGraph(
    _stored: StoredTimer,
    _side: 'before' | 'after',
  ): void {
    // The graph is placed with the brew time, which has the order 2.
    settings.brew_order.while[_stored.parameter] = _side === 'before' ? 0 : 9;
    settingsEvents.next({ type: 'UPDATE' });
    fixture.detectChanges();

    const shown = labels('BREW_HEADER_WHILE_BREW');
    expect(shown).toContain(_stored.label);
    expect(
      shown.indexOf(_stored.label) < shown.indexOf('brew-brewing-graph')
        ? 'before'
        : 'after',
    )
      .withContext(_stored.name)
      .toBe(_side);
  }

  /** Expects a timer to show the time stored for it, which is unchanged. */
  function expectStoredTimeShown(_stored: StoredTimer, _when: string): void {
    const context = `${_stored.name}, ${_when}`;
    const timer = _stored.timer();
    expect(moment(timer.displayingTime).format('mm:ss.SSS'))
      .withContext(context)
      .toBe(_stored.shown);
    expect([timer.getSeconds(), timer.getMilliseconds()])
      .withContext(context)
      .toEqual([_stored.seconds, _stored.milliseconds]);
    expect([
      brew[_stored.parameter],
      brew[`${_stored.parameter}_milliseconds` as const],
    ])
      .withContext(context)
      .toEqual([_stored.seconds, _stored.milliseconds]);
  }

  it('renders the fields while brewing in the configured order, the graph with the brew time', () => {
    expect(labels('BREW_HEADER_WHILE_BREW')).toEqual([
      'BREW_DATA_TEMPERATURE_TIME',
      'brew-brewing-graph',
      'BREW_DATA_TIME',
      'BREW_DATA_COFFEE_BLOOMING_TIME',
    ]);
    // The component reaches the graph and the timers inside the layout.
    expect(component.brewBrewingGraphEl).toBe(graph() as any);
    expect(component.timer).toBeDefined();
    expect(component.brewTemperatureTime).toBeDefined();
    expect(component.brewCoffeeBloomingTime).toBeDefined();
    // The section header reads the graph.
    expect(
      card('BREW_HEADER_WHILE_BREW').querySelector(
        'ion-button[aria-label="Maximize controls"]',
      ),
    ).not.toBeNull();
  });

  it('keeps the graph and the brew timer when the settings change while brewing', () => {
    const graphBefore = graph();
    const timerBefore = fixture.nativeElement.querySelector('brew-timer');

    // Another part of the app sorts and switches parameters and saves.
    settings.brew_order.while.brew_temperature_time = 5;
    settings.manage_parameters.coffee_blooming_time = false;
    settingsEvents.next({ type: 'UPDATE' });
    fixture.detectChanges();

    expect(labels('BREW_HEADER_WHILE_BREW')).toEqual([
      'brew-brewing-graph',
      'BREW_DATA_TIME',
      'BREW_DATA_TEMPERATURE_TIME',
    ]);
    expect(graph()).toBe(graphBefore);
    expect(BrewBrewingGraphStubComponent.created).toBe(1);
    expect(BrewBrewingGraphStubComponent.destroyed).toBe(0);
    expect(fixture.nativeElement.querySelector('brew-timer')).toBe(timerBefore);
  });

  it('keeps every field when settings are saved without a change of the layout', () => {
    const rowsBefore = rows('BREW_HEADER_WHILE_BREW');

    settings.brew_rating = 10;
    settingsEvents.next({ type: 'UPDATE' });
    fixture.detectChanges();

    const rowsAfter = rows('BREW_HEADER_WHILE_BREW');
    expect(rowsAfter.length).toBe(rowsBefore.length);
    for (const [index, row] of rowsAfter.entries()) {
      expect(row).toBe(rowsBefore[index]);
    }
    expect(BrewBrewingGraphStubComponent.created).toBe(1);
  });

  it('lays out the fields of a newly chosen preparation with custom parameters', () => {
    const graphBefore = graph();
    const custom = new Preparation();
    custom.style_type = PREPARATION_STYLE_TYPE.ESPRESSO;
    custom.use_custom_parameters = true;
    for (const key of Object.keys(custom.manage_parameters)) {
      (custom.manage_parameters as any)[key] = false;
    }
    custom.manage_parameters.brew_time = true;
    custom.manage_parameters.coffee_first_drip_time = true;
    custom.manage_parameters.brew_temperature_time = true;
    custom.manage_parameters.grind_weight = true;
    custom.manage_parameters.brew_temperature = true;
    Object.assign(custom.brew_order.while, {
      coffee_first_drip_time: 0,
      brew_time: 1,
      brew_temperature_time: 2,
    });
    Object.assign(custom.brew_order.before, {
      brew_temperature: 0,
      grind_weight: 1,
    });
    preparation = custom;
    component.uiShowSectionBeforeBrew = true;

    component.setChoosenPreparation();
    fixture.detectChanges();

    expect(labels('BREW_HEADER_BEFORE_BREW')).toEqual([
      'BREW_DATA_BREW_TEMPERATURE',
      'BREW_DATA_GRIND_WEIGHT',
    ]);
    expect(labels('BREW_HEADER_WHILE_BREW')).toEqual([
      'BREW_DATA_COFFEE_FIRST_DRIP_TIME',
      'brew-brewing-graph',
      'BREW_DATA_TIME',
      'ion-item',
      'BREW_DATA_TEMPERATURE_TIME',
    ]);
    // The coffee brew time is written into its row directly.
    expect(component.calculatedCoffeeBrewTime).toBeDefined();
    expect(graph()).toBe(graphBefore);
    expect(BrewBrewingGraphStubComponent.destroyed).toBe(0);
  });

  it('shows a field that is switched on in the open preparation, e.g. TDS by a refractometer', () => {
    preparation.use_custom_parameters = true;
    for (const key of Object.keys(preparation.manage_parameters)) {
      (preparation.manage_parameters as any)[key] = false;
    }
    component.setChoosenPreparation();
    component.uiShowSectionAfterBrew = true;
    fixture.detectChanges();
    expect(labels('BREW_HEADER_AFTER_BREW')).toEqual([]);

    preparation.manage_parameters.tds = true;
    preparationEvents.next({ type: 'UPDATE' });
    fixture.detectChanges();

    expect(labels('BREW_HEADER_AFTER_BREW')).toEqual(['BREW_DATA_TDS']);
  });

  for (const stored of STORED_TIMERS) {
    it(`shows the stored ${stored.name} when its timer changes sides at the graph`, () => {
      chooseEspressoMethod();
      sortToSideOfGraph(stored, 'before');
      storeTimes();

      // The fields on either side of the graph are rendered apart, so a
      // timer that changes sides is created anew.
      sortToSideOfGraph(stored, 'after');
      expectStoredTimeShown(stored, 'sorted after the graph');

      sortToSideOfGraph(stored, 'before');
      expectStoredTimeShown(stored, 'sorted before the graph again');
    });

    it(`shows the stored ${stored.name} when its timer is shown again`, () => {
      chooseEspressoMethod();
      storeTimes();

      settings.manage_parameters[stored.parameter] = false;
      settingsEvents.next({ type: 'UPDATE' });
      fixture.detectChanges();
      expect(labels('BREW_HEADER_WHILE_BREW')).not.toContain(stored.label);
      expect(stored.timer()).toBeUndefined();

      settings.manage_parameters[stored.parameter] = true;
      settingsEvents.next({ type: 'UPDATE' });
      fixture.detectChanges();
      expect(labels('BREW_HEADER_WHILE_BREW')).toContain(stored.label);
      expectStoredTimeShown(stored, 'shown again');
    });
  }

  it('shows the stored times in the timers of a newly chosen preparation with its own sort order', () => {
    // The last brew had a first drip time, which a filter method hides.
    storeTimes();
    const filter = preparation;
    expect(labels('BREW_HEADER_WHILE_BREW')).toEqual([
      'BREW_DATA_TEMPERATURE_TIME',
      'brew-brewing-graph',
      'BREW_DATA_TIME',
      'BREW_DATA_COFFEE_BLOOMING_TIME',
    ]);

    // This one sorts the bloom time first and the temperature time last,
    // and shows the first drip time by its custom parameters.
    const custom = new Preparation();
    custom.style_type = PREPARATION_STYLE_TYPE.POUR_OVER;
    custom.use_custom_parameters = true;
    for (const key of Object.keys(custom.manage_parameters)) {
      (custom.manage_parameters as any)[key] = false;
    }
    custom.manage_parameters.brew_time = true;
    custom.manage_parameters.brew_temperature_time = true;
    custom.manage_parameters.coffee_blooming_time = true;
    custom.manage_parameters.coffee_first_drip_time = true;
    Object.assign(custom.brew_order.while, {
      coffee_blooming_time: 0,
      coffee_first_drip_time: 1,
      brew_time: 2,
      brew_temperature_time: 3,
    });
    preparation = custom;
    component.setChoosenPreparation();
    fixture.detectChanges();

    expect(labels('BREW_HEADER_WHILE_BREW')).toEqual([
      'BREW_DATA_COFFEE_BLOOMING_TIME',
      'BREW_DATA_COFFEE_FIRST_DRIP_TIME',
      'brew-brewing-graph',
      'BREW_DATA_TIME',
      'ion-item',
      'BREW_DATA_TEMPERATURE_TIME',
    ]);
    for (const stored of STORED_TIMERS) {
      expectStoredTimeShown(stored, 'preparation with its own sort order');
    }

    preparation = filter;
    component.setChoosenPreparation();
    fixture.detectChanges();

    expect(labels('BREW_HEADER_WHILE_BREW')).toEqual([
      'BREW_DATA_TEMPERATURE_TIME',
      'brew-brewing-graph',
      'BREW_DATA_TIME',
      'BREW_DATA_COFFEE_BLOOMING_TIME',
    ]);
    const [temperatureTime, bloomTime] = STORED_TIMERS;
    expectStoredTimeShown(temperatureTime, 'first preparation again');
    expectStoredTimeShown(bloomTime, 'first preparation again');
  });
});
