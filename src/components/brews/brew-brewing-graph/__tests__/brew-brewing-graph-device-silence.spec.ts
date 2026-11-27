import { signal } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';

import { Subject } from 'rxjs';

import { DEVICE_SILENCE_MS } from '../../../../brew-session/rules/deviceSilenceHint';
import { ScaleType } from '../../../../classes/devices';
import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import { BrewBrewingGraphComponent } from '../brew-brewing-graph.component';

describe('BrewBrewingGraphComponent hint on a silent device', () => {
  let component: BrewBrewingGraphComponent;
  let flow: Subject<unknown>;
  let pressure: Subject<{ actual: number }>;
  let scaleType: ScaleType;
  let timerRunning: boolean;
  let announce: jasmine.Spy;
  let warn: jasmine.Spy;

  beforeEach(() => {
    flow = new Subject();
    pressure = new Subject();
    scaleType = ScaleType.LUNAR;
    timerRunning = false;
    announce = jasmine.createSpy('announce');
    warn = jasmine.createSpy('warn');
    component = Object.assign(
      Object.create(BrewBrewingGraphComponent.prototype),
      {
        bleManager: {
          getScale: () => ({
            device_name: 'LUNAR-123',
            supportsTwoWeights: false,
            flowChange: flow,
            getScaleType: () => scaleType,
          }),
          getPressureDevice: () => ({
            device_name: 'PRS',
            pressureChange: pressure,
          }),
        },
        data: {
          getPreparation: () => ({
            style_type: PREPARATION_STYLE_TYPE.ESPRESSO,
          }),
        },
        brewComponent: {
          timer: { isTimerRunning: () => timerRunning },
        },
        settings: { pressure_threshold_active: false },
        platform: { platforms: () => ['android'] },
        translate: { instant: (_key: string) => `text of ${_key}` },
        announcer: { announce },
        uiLog: { warn },
        silenceTimers: { scale: undefined, pressure: undefined },
        silenceHints: {
          scale: signal<string | null>(null),
          pressure: signal<string | null>(null),
        },
      },
    );
    spyOn(component, 'setActualSmartInformation').and.stub();
  });

  const hints = () => [
    component['silenceHints'].scale(),
    component['silenceHints'].pressure(),
  ];

  it('shows and says the hint when the scale sends nothing', fakeAsync(() => {
    component.attachToFlowChange();
    tick(DEVICE_SILENCE_MS);

    expect(hints()).toEqual(['DEVICE_SILENCE_HINT.SCALE', null]);
    expect(announce).toHaveBeenCalledOnceWith(
      'text of DEVICE_SILENCE_HINT.SCALE',
      'polite',
      'device-silence-scale',
    );
    expect(warn.calls.mostRecent().args[0]).toContain('LUNAR-123');
  }));

  it('asks to load a Futula scale', fakeAsync(() => {
    scaleType = ScaleType.FUTULA;
    component.attachToFlowChange();
    tick(DEVICE_SILENCE_MS);

    expect(hints()[0]).toBe('DEVICE_SILENCE_HINT.SCALE_ON_CHANGE');
  }));

  it('stays quiet when the scale sends a value', fakeAsync(() => {
    component.attachToFlowChange();
    flow.next({});
    tick(DEVICE_SILENCE_MS);

    expect(hints()).toEqual([null, null]);
    expect(announce).not.toHaveBeenCalled();
  }));

  it('removes the hint silently with the first value', fakeAsync(() => {
    component.attachToFlowChange();
    tick(DEVICE_SILENCE_MS);
    flow.next({});

    expect(hints()[0]).toBeNull();
    expect(announce).toHaveBeenCalledTimes(1);
  }));

  it('says nothing after leaving the page within the wait', fakeAsync(() => {
    component.attachToFlowChange();
    component.deattachToFlowChange();
    tick(DEVICE_SILENCE_MS);

    expect(hints()).toEqual([null, null]);
    expect(announce).not.toHaveBeenCalled();
  }));

  it('waits once although it is attached again', fakeAsync(() => {
    component.attachToFlowChange();
    tick(DEVICE_SILENCE_MS - 1000);
    component.attachToFlowChange();
    tick(DEVICE_SILENCE_MS);

    expect(announce).toHaveBeenCalledTimes(1);
  }));

  it('removes the hint when the scale disconnects', fakeAsync(() => {
    component.attachToFlowChange();
    tick(DEVICE_SILENCE_MS);
    component.deattachToFlowChange();

    expect(hints()[0]).toBeNull();
  }));

  it('does not interrupt a running brew', fakeAsync(() => {
    timerRunning = true;
    component.attachToFlowChange();
    tick(DEVICE_SILENCE_MS);

    expect(hints()).toEqual([null, null]);
    expect(announce).not.toHaveBeenCalled();
  }));

  it('shows the hint when the pressure sensor sends nothing', fakeAsync(() => {
    component.attachToPressureChange();
    tick(DEVICE_SILENCE_MS);

    expect(hints()).toEqual([null, 'DEVICE_SILENCE_HINT.PRESSURE']);
    expect(announce).toHaveBeenCalledOnceWith(
      'text of DEVICE_SILENCE_HINT.PRESSURE',
      'polite',
      'device-silence-pressure',
    );

    pressure.next({ actual: 2 });
    expect(hints()[1]).toBeNull();
    component.deattachToPressureChange();
  }));

  it('does not watch the pressure sensor outside espresso', fakeAsync(() => {
    component.data = {
      getPreparation: () => ({ style_type: PREPARATION_STYLE_TYPE.POUR_OVER }),
    } as never;
    component.attachToPressureChange();
    tick(DEVICE_SILENCE_MS);

    expect(hints()).toEqual([null, null]);
  }));
});
