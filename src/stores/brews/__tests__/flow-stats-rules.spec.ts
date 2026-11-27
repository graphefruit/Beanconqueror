import { BrewFlow } from '../../../classes/brew/brewFlow';
import { averageFlow, peakFlow } from '../flow-stats-rules';

function flow(water: (number | null)[], realtime: (number | null)[]): BrewFlow {
  const brew = new BrewFlow();
  brew.waterFlow = water.map((value) => ({
    value,
    brew_time: '',
    timestamp: '',
  }));
  brew.realtimeFlow = realtime.map((flow_value) => ({
    flow_value,
    brew_time: '',
    timestamp: '',
    smoothed_weight: 0,
    timestampdelta: 0,
  }));
  return brew;
}

describe('flow stats rules', () => {
  it('averages the flow per second over the moments something flowed', () => {
    expect(averageFlow(flow([0, 2, 4, -1], [10]))).toBe(3);
  });

  it('takes the realtime flow when the scale gave no flow per second', () => {
    expect(averageFlow(flow([], [0, 1.5, 2.5]))).toBe(2);
  });

  it('stays with the flow per second when nothing flowed by it', () => {
    expect(averageFlow(flow([0, 0], [5]))).toBe(0);
  });

  it('takes the highest realtime flow as the peak', () => {
    expect(peakFlow(flow([], [1, 7.5, -2, 3]))).toBe(7.5);
  });

  it('reads 0 for a brew without flow, a missing file or broken entries', () => {
    for (const each of [null, undefined, new BrewFlow(), flow([], [])]) {
      expect(averageFlow(each)).toBe(0);
      expect(peakFlow(each)).toBe(0);
    }
    const broken = flow([null], [null, Number.NaN]);
    broken.realtimeFlow.push(null);
    expect(averageFlow(broken)).toBe(0);
    expect(peakFlow(broken)).toBe(0);
    expect(
      averageFlow({ waterFlow: undefined, realtimeFlow: null } as BrewFlow),
    ).toBe(0);
  });
});
