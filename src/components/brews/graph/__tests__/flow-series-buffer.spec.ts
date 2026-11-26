import recordedFourth from '../../../../assets/BeanconquerorFlowTestDataFourth.json';
import recordedThird from '../../../../assets/BeanconquerorFlowTestDataThird.json';
import { BrewFlow, IBrewWeightFlow } from '../../../../classes/brew/brewFlow';
import { MeticulousDevice } from '../../../../classes/preparationDevice/meticulous/meticulousDevice';
import {
  FlowSeriesBuffer,
  lowerBound,
  parseClockSeconds,
  sampleTime,
} from '../flow-series-buffer';
import type { SeriesId } from '../series-def';

function w(
  timestamp: string,
  brew_time: string,
  actual_weight: number,
): IBrewWeightFlow {
  return {
    timestamp,
    brew_time,
    actual_weight,
    old_weight: 0,
    actual_smoothed_weight: 0,
    old_smoothed_weight: 0,
    calculated_real_flow: 0,
    not_mutated_weight: actual_weight,
  };
}

function values(buffer: FlowSeriesBuffer, id: SeriesId): number[] {
  return Array.from(buffer.view(id).y);
}

function times(buffer: FlowSeriesBuffer, id: SeriesId): number[] {
  return Array.from(buffer.view(id).t).map((t) => Number(t.toFixed(3)));
}

/** A brew as BrewImportService.build() stores it (brew-import spec envelope). */
function importedFlow(): BrewFlow {
  const flow = new BrewFlow();
  flow.weight = [
    w('00:00:00.000', '0.000', 0),
    w('00:00:00.250', '0.250', 75),
    w('00:00:01.000', '1.000', 50),
  ];
  flow.waterDispensed = [
    { actual: 0, old: 0, timestamp: '00:00:00.000', brew_time: '0.000' },
    { actual: 25, old: 0, timestamp: '00:00:00.250', brew_time: '0.250' },
    { actual: 125, old: 25, timestamp: '00:00:01.000', brew_time: '1.000' },
  ];
  flow.temperatureFlow = [
    {
      actual_temperature: 91,
      old_temperature: 0,
      timestamp: '00:00:00.000',
      brew_time: '0.000',
    },
  ];
  flow.customMetrics = {
    targetTemperature: [
      { value: 93, timestamp: '00:00:00.000', brew_time: '0.000' },
      { value: 91, timestamp: '00:00:45.000', brew_time: '45.000' },
    ],
    measuredAgitation: [
      { value: 120, timestamp: '00:00:10.000', brew_time: '10.000' },
    ],
  };
  flow.customAxes = [
    {
      key: 'targetTemperature',
      namePrefix: 'BREW_IMPORT_METRIC_TARGET',
      name: 'Temperature',
      unit: '°C',
      colorLight: '#123456',
      colorDark: '#abcdef',
    },
  ];
  return flow;
}

describe('FlowSeriesBuffer', () => {
  it('loads recorded brews without losing a sample', () => {
    for (const recorded of [recordedThird, recordedFourth]) {
      const flow = recorded as unknown as BrewFlow;
      const buffer = new FlowSeriesBuffer();

      expect(buffer.load(flow)).toEqual({ hasGraph: true, skipped: 0 });
      expect(buffer.length('weight')).toBe(flow.weight.length);
      expect(buffer.length('flowPerSecond')).toBe(flow.waterFlow.length);
      expect(buffer.length('realtimeFlow')).toBe(flow.realtimeFlow.length);
      expect(buffer.length('pressure')).toBe(flow.pressureFlow.length);
      expect(buffer.length('temperature')).toBe(
        flow.temperatureFlow?.length ?? 0,
      );
      expect(values(buffer, 'weight')).toEqual(
        flow.weight.map((s) => s.actual_weight),
      );
      expect(buffer.view('weight').t[0]).toBe(0);
    }
  });

  it('times every series from the first weight sample, as the detail graph does', () => {
    const flow = recordedFourth as unknown as BrewFlow;
    const buffer = new FlowSeriesBuffer();
    buffer.load(flow);

    const start = parseClockSeconds(flow.weight[0].timestamp);
    const last = flow.pressureFlow[flow.pressureFlow.length - 1];
    const t = buffer.view('pressure').t;
    expect(t[t.length - 1]).toBeCloseTo(
      parseClockSeconds(last.timestamp) - start,
      6,
    );
  });

  it('loads an imported brew with its custom metrics and their axes', () => {
    const buffer = new FlowSeriesBuffer();

    expect(buffer.load(importedFlow()).hasGraph).toBeTrue();
    expect(buffer.seriesIds()).toEqual([
      'weight',
      'temperature',
      'waterDispensed',
      'custom:targetTemperature',
      'custom:measuredAgitation',
    ]);
    expect(times(buffer, 'custom:targetTemperature')).toEqual([0, 45]);
    expect(values(buffer, 'custom:measuredAgitation')).toEqual([120]);
    expect(values(buffer, 'waterDispensed')).toEqual([0, 25, 125]);
    expect(buffer.customAxis('custom:targetTemperature')?.namePrefix).toBe(
      'BREW_IMPORT_METRIC_TARGET',
    );
    expect(buffer.customAxis('custom:measuredAgitation')).toBeUndefined();
    expect(buffer.endTime()).toBe(45);
  });

  it('loads the second scale and water flow series', () => {
    const flow = new BrewFlow();
    flow.weight = [w('08:00:00.000', '0.0', 1)];
    flow.weightSecond = [
      w('08:00:00.100', '0.1', 2),
      w('08:00:00.200', '0.2', 3),
    ];
    flow.realtimeFlowSecond = [
      {
        flow_value: 0.5,
        timestamp: '08:00:00.200',
        brew_time: '0.2',
        smoothed_weight: 0,
        timestampdelta: 0,
      },
    ];
    flow.waterDispensedFlowSecond = [
      { actual: 4, old: 0, timestamp: '08:00:01.000', brew_time: '1.0' },
    ];
    const buffer = new FlowSeriesBuffer();
    buffer.load(flow);

    expect(times(buffer, 'weightSecond')).toEqual([0.1, 0.2]);
    expect(values(buffer, 'weightSecond')).toEqual([2, 3]);
    expect(values(buffer, 'realtimeFlowSecond')).toEqual([0.5]);
    expect(times(buffer, 'waterDispensedFlowSecond')).toEqual([1]);
  });

  it('recovers legacy Meticulous times from the timestamps', () => {
    const flow = MeticulousDevice.returnBrewFlowForShotData(
      [100, 1350, 30125].map((time, index) => ({
        time,
        shot: { weight: index * 12, pressure: 9, gravimetric_flow: 2 },
      })),
    );
    for (const samples of [flow.weight, flow.pressureFlow, flow.realtimeFlow]) {
      samples.forEach((sample) => (sample.brew_time = ''));
    }
    const buffer = new FlowSeriesBuffer();

    expect(buffer.load(flow)).toEqual({ hasGraph: true, skipped: 0 });
    for (const id of ['weight', 'pressure', 'realtimeFlow'] as SeriesId[]) {
      expect(times(buffer, id)).toEqual([0, 1.25, 30.025]);
    }
    expect(values(buffer, 'weight')).toEqual([0, 12, 24]);
  });

  it('carries a brew on past midnight', () => {
    const flow = new BrewFlow();
    flow.weight = [w('23:59:59.500', '0.0', 1), w('00:00:00.500', '1.0', 2)];
    const buffer = new FlowSeriesBuffer();
    buffer.load(flow);

    expect(times(buffer, 'weight')).toEqual([0, 1]);
  });

  it('falls back to brew_time when the timestamps cannot be read', () => {
    const flow = new BrewFlow();
    flow.weight = [w('', '0.5', 1), w('garbage', '1.5', 2)];
    const buffer = new FlowSeriesBuffer();
    buffer.load(flow);

    expect(times(buffer, 'weight')).toEqual([0.5, 1.5]);
  });

  it('skips broken samples and never throws on a broken file', () => {
    const flow = {
      weight: [
        w('10:00:00.000', '0', 1),
        null,
        'text',
        { timestamp: 'x', brew_time: '', actual_weight: 3 },
        { timestamp: '10:00:01.000', brew_time: '1', actual_weight: 'NaN' },
        { timestamp: '10:00:02.000', brew_time: '2', actual_weight: '4.5' },
        { timestamp: '10:00:03.000', brew_time: '3', actual_weight: '' },
      ],
      pressureFlow: 'not a list',
      customMetrics: { broken: null, alsoBroken: [{ value: Infinity }] },
      customAxes: [null, { name: 'no key' }],
    } as unknown as BrewFlow;
    const buffer = new FlowSeriesBuffer();

    const result = buffer.load(flow);

    expect(result).toEqual({ hasGraph: true, skipped: 6 });
    expect(values(buffer, 'weight')).toEqual([1, 4.5]);
    expect(buffer.has('pressure')).toBeFalse();
    expect(buffer.has('custom:broken')).toBeFalse();
  });

  it('reports no graph with a reason instead of throwing', () => {
    const buffer = new FlowSeriesBuffer();

    expect(buffer.load(undefined)).toEqual({
      hasGraph: false,
      reason: 'empty',
      skipped: 0,
    });
    expect(buffer.load(new BrewFlow())).toEqual({
      hasGraph: false,
      reason: 'empty',
      skipped: 0,
    });
    const unreadable = new BrewFlow();
    unreadable.weight = [w('nope', 'nope', 1)];
    expect(buffer.load(unreadable)).toEqual({
      hasGraph: false,
      reason: 'invalid',
      skipped: 1,
    });
    expect(buffer.seriesIds()).toEqual([]);
  });

  it('sorts a file whose samples are out of order', () => {
    const flow = new BrewFlow();
    flow.weight = [
      w('00:00:00.000', '0', 0),
      w('00:00:01.000', '1', 50),
      w('00:00:00.250', '0.25', 75),
    ];
    const buffer = new FlowSeriesBuffer();
    buffer.load(flow);

    expect(times(buffer, 'weight')).toEqual([0, 0.25, 1]);
    expect(values(buffer, 'weight')).toEqual([0, 75, 50]);
  });

  it('replaces the previous content on load', () => {
    const buffer = new FlowSeriesBuffer();
    buffer.load(importedFlow());
    const flow = new BrewFlow();
    flow.weight = [w('00:00:00.000', '0', 7)];

    buffer.load(flow);

    expect(buffer.seriesIds()).toEqual(['weight']);
    expect(buffer.customAxis('custom:targetTemperature')).toBeUndefined();
  });

  it('grows while appending and counts every change', () => {
    const buffer = new FlowSeriesBuffer(2);
    const before = buffer.version;
    for (let i = 0; i < 40; i++) {
      buffer.append('weight', i / 10, i);
    }

    expect(buffer.length('weight')).toBe(40);
    expect(buffer.view('weight').y[39]).toBe(39);
    expect(buffer.version).toBe(before + 40);
    expect(buffer.endTime()).toBeCloseTo(3.9, 6);
  });

  it('replaces the last value, as a machine correcting its flow does', () => {
    const buffer = new FlowSeriesBuffer();
    expect(buffer.replaceLast('realtimeFlow', 2)).toBeFalse();
    buffer.append('realtimeFlow', 0, 1);
    buffer.append('realtimeFlow', 0.1, 1.5);
    const before = buffer.version;

    expect(buffer.replaceLast('realtimeFlow', 2.2)).toBeTrue();
    expect(values(buffer, 'realtimeFlow')).toEqual([1, 2.2]);
    expect(buffer.length('realtimeFlow')).toBe(2);
    expect(buffer.version).toBe(before + 1);
  });

  it('keeps a custom axis set while recording', () => {
    const buffer = new FlowSeriesBuffer();
    buffer.setCustomAxis({
      key: 'tds',
      name: 'TDS',
      unit: '%',
      colorLight: '#111111',
      colorDark: '#eeeeee',
    });

    expect(buffer.customAxis('custom:tds')?.name).toBe('TDS');
    buffer.clear();
    expect(buffer.customAxis('custom:tds')).toBeUndefined();
  });

  it('gives an empty view of an unknown series', () => {
    const buffer = new FlowSeriesBuffer();

    expect(buffer.view('pressure').t.length).toBe(0);
    expect(buffer.length('pressure')).toBe(0);
    expect(buffer.endTime()).toBe(0);
  });

  describe('time helpers', () => {
    it('parses clock times with and without milliseconds', () => {
      expect(parseClockSeconds('01:02:03.4')).toBeCloseTo(3723.4, 6);
      expect(parseClockSeconds('01:02:03')).toBe(3723);
      expect(parseClockSeconds('1:2:3')).toBeNaN();
      expect(parseClockSeconds(undefined)).toBeNaN();
    });

    it('keeps a sample a few ms before the first one slightly negative', () => {
      const start = parseClockSeconds('10:00:00.100');
      expect(
        sampleTime({ timestamp: '10:00:00.050', brew_time: '' }, start),
      ).toBeCloseTo(-0.05, 6);
    });

    it('finds the first index at or above a value', () => {
      const t = Float64Array.from([0, 1, 1, 2]);
      expect(lowerBound(t, -1)).toBe(0);
      expect(lowerBound(t, 1)).toBe(1);
      expect(lowerBound(t, 1.5)).toBe(3);
      expect(lowerBound(t, 9)).toBe(4);
    });
  });
});
