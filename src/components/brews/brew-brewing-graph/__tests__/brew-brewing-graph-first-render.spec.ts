import { ChangeDetectorRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';

import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import { Announcer } from '../../../../services/a11y/announcer.service';
import { CoffeeBluetoothDevicesService } from '../../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { TextToSpeechService } from '../../../../services/textToSpeech/text-to-speech.service';
import { ThemeService } from '../../../../services/theme/theme.service';
import { UIAlert } from '../../../../services/uiAlert';
import { UIBrewHelper } from '../../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../../services/uiBrewStorage';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIGraphStorage } from '../../../../services/uiGraphStorage.service';
import { UIHelper } from '../../../../services/uiHelper';
import { UILog } from '../../../../services/uiLog';
import { UIPreparationHelper } from '../../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { UIToast } from '../../../../services/uiToast';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

/**
 * The header of the brew form shows "Maximize controls" while the graph is
 * hidden and the graph buttons once it shows. A connected device must show the
 * graph from the first render: a button swapped later takes the focus of a
 * keyboard or screen reader user with it.
 */
describe('BrewBrewingGraphComponent devices on the first render', () => {
  let scale: object | undefined;

  function create(): BrewBrewingGraphComponent {
    return TestBed.runInInjectionContext(() => new BrewBrewingGraphComponent());
  }

  beforeEach(() => {
    scale = undefined;
    const stubs = [
      Announcer,
      ChangeDetectorRef,
      ModalController,
      TranslateService,
      TextToSpeechService,
      UIAlert,
      UIBrewHelper,
      UIBrewStorage,
      UIFileHelper,
      UIGraphStorage,
      UIHelper,
      UILog,
      UIPreparationHelper,
      UIPreparationStorage,
      UISettingsStorage,
      UIToast,
    ].map((provide) => ({ provide, useValue: {} }));
    TestBed.configureTestingModule({
      providers: [
        ...stubs,
        { provide: Platform, useValue: { is: () => true } },
        { provide: ThemeService, useValue: { dark: signal(false) } },
        {
          provide: CoffeeBluetoothDevicesService,
          useValue: {
            getScale: () => scale,
            getPressureDevice: () => undefined,
            getTemperatureDevice: () => undefined,
          },
        },
      ],
    });
  });

  it('shows the graph from the start when a scale is connected', () => {
    scale = {};

    const component = create();

    expect(component.uiSmartScaleConnected).toBeTrue();
    expect(component.shallFlowProfileBeHidden()).toBeFalse();
  });

  it('keeps the graph hidden when nothing is connected', () => {
    const component = create();

    expect(component.uiSmartScaleConnected).toBeFalse();
    expect(component.uiPressureConnected).toBeFalse();
    expect(component.uiTemperatureConnected).toBeFalse();
  });

  it('records a pressure reading of a timer started before the graph is mounted', () => {
    scale = {};
    const component = create();
    Object.assign(component, {
      uiHelper: {
        toFixedIfNecessary: (value: number) => value,
        getActualTimeWithMilliseconds: () => 0,
      },
      brewComponent: { getTime: () => 0 },
      data: {
        getPreparation: () => ({ style_type: PREPARATION_STYLE_TYPE.ESPRESSO }),
      },
    });
    const graph = component as unknown as {
      __setPressureFlow(pressure: { actual: number; old: number }): void;
    };

    expect(() => graph.__setPressureFlow({ actual: 2, old: 2 })).not.toThrow();
    expect(component.flow_profile_raw.pressureFlow.length).toBe(1);
  });

  it('hands the series of the connected scale to the graph before the start', async () => {
    scale = {};
    const component = create();
    const renderer = jasmine.createSpyObj('UplotRenderer', ['setAwaited']);
    Object.assign(component, {
      renderer,
      data: {
        getPreparation: () => ({ style_type: PREPARATION_STYLE_TYPE.ESPRESSO }),
      },
    });

    await (
      component as unknown as { setUIParams(): Promise<void> }
    ).setUIParams();

    expect(renderer.setAwaited).toHaveBeenCalledOnceWith(
      new Set(['weight', 'flowPerSecond', 'realtimeFlow']),
    );
  });
});
