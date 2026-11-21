import BaristamodeBrew from '../../brew/baristamodeBrew';
import { Brew } from '../../brew/brew';
import { Visualizer } from '../visualizer';

describe('Visualizer', () => {
  describe('mapBrew', () => {
    function withChangeInfo<T extends Brew | BaristamodeBrew>(_brew: T): T {
      _brew.brew_time = 27;
      _brew.config.uuid = 'brew-1';
      _brew.config.unix_timestamp = 1700000000;
      _brew.config.created_at = 1690000000000;
      _brew.config.updated_at = 1700000000000;
      _brew.config.rev = 3;
      _brew.config.updated_by = 'device-a';
      return _brew;
    }

    for (const [name, create] of [
      ['brew', () => new Brew()],
      ['barista mode brew', () => new BaristamodeBrew()],
    ] as const) {
      it(`takes the time of a ${name} but neither its id nor its change info`, () => {
        const brew = withChangeInfo(create());
        const visualizer = new Visualizer();

        visualizer.mapBrew(brew);

        expect(visualizer.brew.brew_time).toBe(27);
        const text = JSON.stringify(visualizer);
        const sent = JSON.parse(text) as { brew: { config: unknown } };
        expect(sent.brew.config).toEqual({ unix_timestamp: 1700000000 });
        expect(text).not.toContain('brew-1');
        expect(text).not.toContain('device-a');
      });
    }

    it('leaves the config of the brew as it is, also when the visualizer data changes', () => {
      const brew = withChangeInfo(new Brew());
      const before = structuredClone(brew.config);
      const visualizer = new Visualizer();

      visualizer.mapBrew(brew);
      visualizer.brew.config.unix_timestamp = 1;

      expect(visualizer.brew.config).not.toBe(brew.config);
      expect({ ...brew.config }).toEqual({ ...before });
    });
  });
});
