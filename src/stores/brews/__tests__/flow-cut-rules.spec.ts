import { Brew } from '../../../classes/brew/brew';
import { BrewFlow } from '../../../classes/brew/brewFlow';
import { MeticulousDevice } from '../../../classes/preparationDevice/meticulous/meticulousDevice';
import {
  applyFlowCut,
  beforeCutPathOf,
  calculateCutBounds,
  FlowCutSave,
  performFlowCut,
} from '../flow-cut-rules';

describe('flow cut rules', () => {
  it('recovers legacy Meticulous times and cuts all imported traces', () => {
    const flow = MeticulousDevice.returnBrewFlowForShotData(
      [100, 1350, 30125].map((time, index) => ({
        time,
        shot: { weight: index * 12, pressure: 9, gravimetric_flow: 2 },
      })),
    );
    for (const samples of [flow.weight, flow.pressureFlow, flow.realtimeFlow]) {
      samples.forEach((sample) => {
        sample.brew_time = '';
      });
    }

    expect(calculateCutBounds(flow)).toBe(30.025);

    const result = performFlowCut(flow, 1.25, 2, new Brew());
    for (const samples of [
      result.flowProfile.weight,
      result.flowProfile.pressureFlow,
      result.flowProfile.realtimeFlow,
    ]) {
      expect(samples.length).toBe(1);
      expect(samples[0].brew_time).toBe('0.0');
      expect(samples[0].timestamp).toBe('00:00:00.100');
    }
    expect(result.finalWeight).toBe(12);
  });

  it('preserves elapsed times already stored by the importer', () => {
    const flow = MeticulousDevice.returnBrewFlowForShotData([
      { time: 100, shot: { weight: 0, pressure: 0, gravimetric_flow: 0 } },
      { time: 30125, shot: { weight: 24, pressure: 9, gravimetric_flow: 2 } },
    ]);

    expect(calculateCutBounds(flow)).toBe(30.125);
    expect(flow.weight[0].brew_time).toBe('0.100');
    expect(flow.weight[1].brew_time).toBe('30.125');
  });

  it('gives 0 as upper bound without a flow profile', () => {
    expect(calculateCutBounds(undefined)).toBe(0);
    expect(calculateCutBounds(new BrewFlow())).toBe(0);
  });

  it('refuses to guess a brew time from an invalid timestamp', () => {
    const flow = new BrewFlow();
    flow.pressureFlow = [
      {
        timestamp: 'not a time',
        brew_time: '',
        actual_pressure: 9,
        old_pressure: 0,
      },
    ];
    expect(() => calculateCutBounds(flow)).toThrowError(/invalid timestamp/);
  });

  it('should correctly filter and shift weights and timestamps', () => {
    // Arrange
    const rawFlow = new BrewFlow();
    rawFlow.weight = [
      {
        timestamp: '12:00:00.000',
        brew_time: '0.0',
        actual_weight: 0,
        old_weight: 0,
        actual_smoothed_weight: 0,
        old_smoothed_weight: 0,
        calculated_real_flow: 0,
        not_mutated_weight: 0,
      },
      {
        timestamp: '12:00:02.000',
        brew_time: '2.0',
        actual_weight: 5.0,
        old_weight: 0,
        actual_smoothed_weight: 5.0,
        old_smoothed_weight: 0,
        calculated_real_flow: 2.5,
        not_mutated_weight: 5.0,
      },
      {
        timestamp: '12:00:05.000',
        brew_time: '5.0',
        actual_weight: 15.0,
        old_weight: 5.0,
        actual_smoothed_weight: 15.0,
        old_smoothed_weight: 5.0,
        calculated_real_flow: 3.3,
        not_mutated_weight: 15.0,
      },
      {
        timestamp: '12:00:10.000',
        brew_time: '10.0',
        actual_weight: 35.0,
        old_weight: 15.0,
        actual_smoothed_weight: 35.0,
        old_smoothed_weight: 15.0,
        calculated_real_flow: 4.0,
        not_mutated_weight: 35.0,
      },
    ];

    // Act
    // Cut from 2.0 to 5.0 seconds
    const result = performFlowCut(rawFlow, 2.0, 5.0);

    // Assert
    expect(result.flowProfile.weight.length).toBe(2);

    // First remaining point (was at 2.0s) should be shifted to 0.0s
    expect(result.flowProfile.weight[0].brew_time).toBe('0.0');
    // Timestamp should be shifted by 2 seconds (2000 ms) back from 12:00:02.000 to 12:00:00.000
    expect(result.flowProfile.weight[0].timestamp).toBe('12:00:00.000');
    // Weight should remain the same absolute value (5.0g) - not tared
    expect(result.flowProfile.weight[0].actual_weight).toBe(5.0);

    // Second remaining point (was at 5.0s) should be shifted to 3.0s (5.0 - 2.0)
    expect(result.flowProfile.weight[1].brew_time).toBe('3.0');
    // Timestamp should be shifted by 2 seconds back from 12:00:05.000 to 12:00:03.000
    expect(result.flowProfile.weight[1].timestamp).toBe('12:00:03.000');
    // Weight should remain the same absolute value (15.0g) - not tared
    expect(result.flowProfile.weight[1].actual_weight).toBe(15.0);

    // Final weight should be 15.0g (the weight at the end of the range)
    expect(result.finalWeight).toBe(15.0);
  });

  it('should shift first drip time and blooming time when cutting from the left', () => {
    const rawFlow = new BrewFlow();
    rawFlow.weight = [
      {
        timestamp: '12:00:02.000',
        brew_time: '2.0',
        actual_weight: 5.0,
        old_weight: 0,
        actual_smoothed_weight: 5.0,
        old_smoothed_weight: 0,
        calculated_real_flow: 2.5,
        not_mutated_weight: 5.0,
      },
    ];

    const mockBrew = new Brew();
    mockBrew.coffee_first_drip_time = 5;
    mockBrew.coffee_first_drip_time_milliseconds = 500;
    mockBrew.coffee_blooming_time = 10;
    mockBrew.coffee_blooming_time_milliseconds = 200;

    // Cut starting at 2.0 seconds -> shift is 2.0s (2000 ms)
    const result = performFlowCut(rawFlow, 2.0, 10.0, mockBrew);

    // First drip time: 5500 ms - 2000 ms = 3500 ms -> 3s 500ms
    expect(result.coffee_first_drip_time).toBe(3);
    expect(result.coffee_first_drip_time_milliseconds).toBe(500);

    // Blooming time: 10200 ms - 2000 ms = 8200 ms -> 8s 200ms
    expect(result.coffee_blooming_time).toBe(8);
    expect(result.coffee_blooming_time_milliseconds).toBe(200);
  });

  it('should set first drip time and blooming time to zero if they fall below or equal to 0:00', () => {
    const rawFlow = new BrewFlow();
    rawFlow.weight = [
      {
        timestamp: '12:00:05.000',
        brew_time: '5.0',
        actual_weight: 5.0,
        old_weight: 0,
        actual_smoothed_weight: 5.0,
        old_smoothed_weight: 0,
        calculated_real_flow: 2.5,
        not_mutated_weight: 5.0,
      },
    ];

    const mockBrew = new Brew();
    mockBrew.coffee_first_drip_time = 4;
    mockBrew.coffee_first_drip_time_milliseconds = 0;
    mockBrew.coffee_blooming_time = 5;
    mockBrew.coffee_blooming_time_milliseconds = 0;

    // Cut starting at 5.0 seconds -> shift is 5.0s (5000 ms)
    const result = performFlowCut(rawFlow, 5.0, 10.0, mockBrew);

    // First drip time: 4000 ms - 5000 ms = -1000 ms <= 0 -> 0s 0ms
    expect(result.coffee_first_drip_time).toBe(0);
    expect(result.coffee_first_drip_time_milliseconds).toBe(0);

    // Blooming time: 5000 ms - 5000 ms = 0 ms <= 0 -> 0s 0ms
    expect(result.coffee_blooming_time).toBe(0);
    expect(result.coffee_blooming_time_milliseconds).toBe(0);
  });

  it('cuts custom metrics and keeps the weight of the second scale', () => {
    const flow = new BrewFlow();
    flow.weightSecond = [
      {
        timestamp: '12:00:01.000',
        brew_time: '1.0',
        actual_weight: 3,
        old_weight: 0,
        actual_smoothed_weight: 3,
        old_smoothed_weight: 0,
        calculated_real_flow: 0,
        not_mutated_weight: 3,
      },
    ];
    flow.customMetrics = {
      puck: [
        { timestamp: '12:00:00.500', brew_time: '0.5', value: 1 },
        { timestamp: '12:00:01.000', brew_time: '1.0', value: 2 },
      ],
    };

    const result = performFlowCut(flow, 0.4, 2);

    expect(result.flowProfile.customMetrics.puck.length).toBe(2);
    expect(result.flowProfile.customMetrics.puck[0].brew_time).toBe('0.0');
    expect(result.flowProfile.weightSecond[0].brew_time).toBe('0.5');
    expect(result.finalWeight).toBe(3);
  });

  it('sets the cut values on a brew and leaves empty quantities empty', () => {
    const brew = new Brew();
    brew.brew_beverage_quantity = 40;
    brew.brew_quantity = 0;
    const cut: FlowCutSave = {
      flowProfile: new BrewFlow(),
      brew_time: 25,
      brew_time_milliseconds: 25000,
      finalWeight: 36,
      coffee_first_drip_time: 3,
      coffee_first_drip_time_milliseconds: 500,
      coffee_blooming_time: 8,
      coffee_blooming_time_milliseconds: 200,
    };

    applyFlowCut(brew, cut);

    expect(brew.brew_time).toBe(25);
    expect(brew.brew_time_milliseconds).toBe(25000);
    expect(brew.brew_beverage_quantity).toBe(36);
    expect(brew.brew_quantity).toBe(0);
    expect(brew.coffee_first_drip_time).toBe(3);
    expect(brew.coffee_first_drip_time_milliseconds).toBe(500);
    expect(brew.coffee_blooming_time).toBe(8);
    expect(brew.coffee_blooming_time_milliseconds).toBe(200);
  });

  it('keeps quantities and times the cut does not give', () => {
    const brew = new Brew();
    brew.brew_quantity = 250;
    brew.coffee_blooming_time = 30;

    applyFlowCut(brew, {
      flowProfile: new BrewFlow(),
      brew_time: 10,
      brew_time_milliseconds: 10000,
    });

    expect(brew.brew_quantity).toBe(250);
    expect(brew.coffee_blooming_time).toBe(30);
  });

  it('names the copy from before the cut beside the flow profile', () => {
    expect(beforeCutPathOf('brews/abc_flow_profile.json')).toBe(
      'brews/abc_flow_profile.before-cut.json',
    );
    expect(beforeCutPathOf('brews/abc')).toBe('brews/abc.before-cut.json');
  });
});
