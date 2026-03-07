import { BrewFlow } from './brewFlow';

describe('BrewFlow', () => {
  it('sets defaults in constructor', () => {
    const flow = new BrewFlow();
    expect(flow.weight.length).toBe(0);
    expect(flow.realtimeFlow.length).toBe(0);
    expect(flow.brewbyweight.length).toBe(0);
  });
});
