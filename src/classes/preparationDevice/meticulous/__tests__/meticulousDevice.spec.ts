import { MeticulousDevice } from '../meticulousDevice';

describe('Meticulous shot graph conversion', () => {
  it('stores elapsed seconds with millisecond precision for every trace', () => {
    const data = [0, 1250, 30567].map((time) => ({
      time,
      shot: { weight: 12, pressure: 9, gravimetric_flow: 2 },
    }));
    const flow = MeticulousDevice.returnBrewFlowForShotData(data);

    for (const samples of [flow.weight, flow.pressureFlow, flow.realtimeFlow]) {
      expect(samples.map((sample) => sample.brew_time)).toEqual([
        '0.000',
        '1.250',
        '30.567',
      ]);
      expect(samples.map((sample) => sample.timestamp)).toEqual([
        '00:00:00.000',
        '00:00:01.250',
        '00:00:30.567',
      ]);
    }
    expect(flow.weight.map((sample) => sample.actual_weight)).toEqual([
      12, 12, 12,
    ]);
  });
});
