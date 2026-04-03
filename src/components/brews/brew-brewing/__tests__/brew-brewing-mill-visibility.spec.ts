import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';

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
import { EMPTY } from 'rxjs';

import { Brew } from '../../../../classes/brew/brew';
import { Mill } from '../../../../classes/mill/mill';
import { Preparation } from '../../../../classes/preparation/preparation';
import { Settings } from '../../../../classes/settings/settings';
import { BrewFieldOrder } from '../../../../pipes/brew/brewFieldOrder';
import { BrewFieldVisiblePipe } from '../../../../pipes/brew/brewFieldVisible';
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
import { BrewBrewingComponent } from '../brew-brewing.component';

/**
 * Tests brew field visibility using the REAL brew-brewing template.
 *
 * Child components (timer, brew-timer, brew-brewing-graph, etc.) and
 * directives (mill-overlay, bean-overlay, etc.) are excluded from imports
 * and rendered as inert custom elements via CUSTOM_ELEMENTS_SCHEMA.
 * ngAfterViewInit is spied out to prevent @ViewChild NPEs.
 *
 * Ionic components are kept so that [(ngModel)] bindings work
 * (ControlValueAccessor). All pipes are kept so @if conditions evaluate.
 */
describe('BrewBrewingComponent mill visibility', () => {
  let component: BrewBrewingComponent;
  let fixture: ComponentFixture<BrewBrewingComponent>;
  let settings: Settings;
  let mockUISettingsStorage: jasmine.SpyObj<any>;

  beforeEach(waitForAsync(() => {
    settings = new Settings();
    // Disable all manage_parameters to keep the rendered template minimal,
    // then enable only the two fields under test.
    for (const key of Object.keys(settings.manage_parameters)) {
      (settings.manage_parameters as any)[key] = false;
    }
    settings.manage_parameters.mill_speed = true;
    settings.manage_parameters.mill_timer = true;

    mockUISettingsStorage = createMockUISettingsStorage();
    mockUISettingsStorage.getSettings.and.returnValue(settings);

    const mockBleManager = jasmine.createSpyObj(
      'CoffeeBluetoothDevicesService',
      ['attachOnEvent'],
    );
    mockBleManager.attachOnEvent.and.returnValue(EMPTY);

    TestBed.overrideComponent(BrewBrewingComponent, {
      set: {
        imports: [
          // Forms
          FormsModule,
          // Ionic components (needed for ControlValueAccessor on ngModel bindings)
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
          // Pipes (needed for @if conditions and [style.order] bindings)
          TranslatePipe,
          KeysPipe,
          ToFixedPipe,
          BrewFieldVisiblePipe,
          BrewFieldOrder,
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
          provide: UIBrewHelper,
          useValue: jasmine.createSpyObj('UIBrewHelper', [
            'fieldVisible',
            'showSectionBeforeBrew',
            'showSectionWhileBrew',
            'showSectionAfterBrew',
          ]),
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
          provide: UIPreparationStorage,
          useValue: jasmine.createSpyObj('UIPreparationStorage', [
            'getAllEntries',
          ]),
        },
        {
          provide: UIHelper,
          useValue: jasmine.createSpyObj('UIHelper', [
            'copyData',
            'cloneData',
            'openExternalWebpage',
          ]),
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
        { provide: CoffeeBluetoothDevicesService, useValue: mockBleManager },
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
    // Prevent ngAfterViewInit from running — it accesses @ViewChild refs
    // (timer, brewBrewingGraphEl, etc.) that don't exist with stub child
    // components, and performs heavy async initialization (BLE subscriptions,
    // loading last brew from storage).
    // Note: Angular Ivy calls lifecycle hooks via the prototype, so the spy
    // must be on the prototype BEFORE createComponent, not on the instance.
    spyOn(BrewBrewingComponent.prototype, 'ngAfterViewInit').and.stub();

    fixture = TestBed.createComponent(BrewBrewingComponent);
    component = fixture.componentInstance;

    // Stub storage-dependent methods called during ngOnInit
    spyOn(component, 'setChoosenPreparation' as any).and.stub();
    spyOn(component, 'setUIParams').and.stub();
  });

  function setupComponent(mill: Mill | undefined): void {
    const brew = new Brew();
    const preparation = new Preparation();
    preparation.use_custom_parameters = false;

    component.data = brew;
    component.settings = settings;
    component.choosenPreparation = preparation;
    component.choosenMill = mill;
    component.uiShowSectionBeforeBrew = true;
    component.uiShowSectionWhileBrew = false;
    component.uiShowSectionAfterBrew = false;
    component.baristamode = false;

    fixture.detectChanges();
  }

  function millSpeedFieldPresent(): boolean {
    // The real template renders: <ion-input label='{{'BREW_DATA_MILL_SPEED' | translate}}' ...>
    // With TranslateModule.forRoot() (no loader), the key resolves to itself.
    // Ionic sets `label` as a DOM property, not an HTML attribute.
    const inputs = fixture.nativeElement.querySelectorAll('ion-input');
    return Array.from(inputs).some(
      (el: any) => el.label === 'BREW_DATA_MILL_SPEED',
    );
  }

  function millTimerFieldPresent(): boolean {
    // The real template renders: <timer label="{{'BREW_DATA_MILL_TIMER' | translate}}" ...>
    // With all other timer-related manage_parameters disabled,
    // the only <timer> element in the DOM is for mill_timer.
    return fixture.nativeElement.querySelector('timer') !== null;
  }

  function createMill(hasAdjustableSpeed: boolean, hasTimer: boolean): Mill {
    const mill = new Mill();
    mill.has_adjustable_speed = hasAdjustableSpeed;
    mill.has_timer = hasTimer;
    return mill;
  }

  describe('mill_speed visibility', () => {
    it('should show mill_speed when mill has adjustable speed and settings enabled', () => {
      // Arrange & Act
      setupComponent(createMill(true, true));

      // Assert
      expect(millSpeedFieldPresent()).toBeTrue();
    });

    it('should hide mill_speed when mill has no adjustable speed', () => {
      // Arrange & Act
      setupComponent(createMill(false, true));

      // Assert
      expect(millSpeedFieldPresent()).toBeFalse();
    });
  });

  describe('mill_timer visibility', () => {
    it('should show mill_timer when mill has timer and settings enabled', () => {
      // Arrange & Act
      setupComponent(createMill(true, true));

      // Assert
      expect(millTimerFieldPresent()).toBeTrue();
    });

    it('should hide mill_timer when mill has no timer', () => {
      // Arrange & Act
      setupComponent(createMill(true, false));

      // Assert
      expect(millTimerFieldPresent()).toBeFalse();
    });
  });

  describe('no mill selected', () => {
    it('should show both fields when no mill is selected and settings enabled', () => {
      // Arrange & Act
      setupComponent(undefined);

      // Assert
      expect(millSpeedFieldPresent()).toBeTrue();
      expect(millTimerFieldPresent()).toBeTrue();
    });
  });

  describe('settings disabled', () => {
    it('should hide mill_speed when settings disable it even if mill has adjustable speed', () => {
      // Arrange
      settings.manage_parameters.mill_speed = false;

      // Act
      setupComponent(createMill(true, true));

      // Assert
      expect(millSpeedFieldPresent()).toBeFalse();
    });

    it('should hide mill_timer when settings disable it even if mill has timer', () => {
      // Arrange
      settings.manage_parameters.mill_timer = false;

      // Act
      setupComponent(createMill(true, true));

      // Assert
      expect(millTimerFieldPresent()).toBeFalse();
    });
  });
});
