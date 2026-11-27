import { config, Subject } from 'rxjs';

import { Brew } from '../../../../classes/brew/brew';
import { SCALE_TIMER_COMMAND } from '../../../../classes/devices';
import { Preparation } from '../../../../classes/preparation/preparation';
import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import { BrewBrewingComponent } from '../../brew-brewing/brew-brewing.component';
import { FlowSeriesBuffer } from '../../graph/flow-series-buffer';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

describe('BrewBrewingGraphComponent without the brew time parameter', () => {
  let component: BrewBrewingGraphComponent;
  let timerEvent: Subject<unknown>;
  let unhandledErrors: unknown[];
  let previousErrorHandler: typeof config.onUnhandledError;

  beforeEach(async () => {
    // A throwing scale event handler would otherwise only surface later.
    unhandledErrors = [];
    previousErrorHandler = config.onUnhandledError;
    config.onUnhandledError = (error) => unhandledErrors.push(error);

    timerEvent = new Subject();
    const scale = { timerEvent, tareEvent: new Subject() };
    component = Object.assign(
      Object.create(BrewBrewingGraphComponent.prototype),
      {
        data: new Brew(),
        // Without the parameter the brew form has no timer component.
        brewComponent: Object.assign(
          Object.create(BrewBrewingComponent.prototype),
          { timer: undefined },
        ),
        bleManager: { getScale: () => scale },
        platform: { is: () => false },
        settings: {},
        uiAlert: { showConfirm: () => Promise.resolve('YES') },
      },
    );
    for (const method of [
      'deattachToWeightChange',
      'deattachToScaleEvents',
      'attachToFlowChange',
      'checkChanges',
    ] as const) {
      spyOn(component, method).and.stub();
    }
    await component['__connectSmartScale'](false);
  });

  afterEach(() => {
    config.onUnhandledError = previousErrorHandler;
  });

  it('ignores the timer buttons of the scale', async () => {
    timerEvent.next({ command: SCALE_TIMER_COMMAND.START });
    timerEvent.next({ command: SCALE_TIMER_COMMAND.STOP });
    timerEvent.next({ command: SCALE_TIMER_COMMAND.RESET });
    timerEvent.next(undefined);
    // RxJS reports handler errors and the reset dialog answers asynchronously.
    await new Promise((resolve) => setTimeout(resolve));

    expect(unhandledErrors).toEqual([]);
  });

  it('moves the maximized graph along without reading a timer', () => {
    const renderer = jasmine.createSpyObj('BrewChartPort', ['setViewport']);
    Object.assign(component.brewComponent, {
      maximizeFlowGraphIsShown: true,
      choosenPreparation: { style_type: PREPARATION_STYLE_TYPE.ESPRESSO },
    });
    spyOn(component.data, 'getPreparation').and.returnValue(
      Object.assign(new Preparation(), {
        style_type: PREPARATION_STYLE_TYPE.ESPRESSO,
      }),
    );
    Object.assign(component, {
      renderer,
      liveBuffer: new FlowSeriesBuffer(),
      recording: false,
      settings: {
        graph_time: {
          ESPRESSO: { NORMAL_SCREEN: 60, FULL_SCREEN: 90 },
          FILTER: { NORMAL_SCREEN: 300, FULL_SCREEN: 600 },
        },
      },
    });

    expect(() => component.updateChart()).not.toThrow();
    expect(renderer.setViewport).toHaveBeenCalledOnceWith({
      mode: 'grow',
      startSec: 90,
    });
  });
});
