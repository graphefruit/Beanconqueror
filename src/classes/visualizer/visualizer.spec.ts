import { BeanVisualizer } from './beanVisualizer';
import { BrewVisualizer } from './brewVisualizer';
import { MillVisualizer } from './millVisualizer';
import { PreparationVisualizer } from './preparationVisualizer';
import { Visualizer } from './visualizer';
import { WaterVisualizer } from './waterVisualizer';

describe('Visualizer classes', () => {
  it('sets defaults on visualizers', () => {
    const bean = new BeanVisualizer();
    const brew = new BrewVisualizer();
    const mill = new MillVisualizer();
    const preparation = new PreparationVisualizer();
    const water = new WaterVisualizer();

    expect(bean.name).toBe('');
    expect(brew.grind_size).toBe('');
    expect(mill.name).toBe('');
    expect(preparation.name).toBe('');
    expect(water.name).toBe('');
  });

  it('maps data into visualizer objects', () => {
    const visualizer = new Visualizer();

    visualizer.mapBean({ name: 'Bean A' } as any);
    expect(visualizer.bean.name).toBe('Bean A');

    visualizer.mapMill({ name: 'Mill A' } as any);
    expect(visualizer.mill.name).toBe('Mill A');

    visualizer.mapPreparation({ name: 'Prep A' } as any);
    expect(visualizer.preparation.name).toBe('Prep A');

    visualizer.mapWater({ name: 'Water A' } as any);
    expect(visualizer.water.name).toBe('Water A');

    visualizer.mapBrew({ grind_size: 'Fine' } as any);
    expect(visualizer.brew.grind_size).toBe('Fine');
  });
});
