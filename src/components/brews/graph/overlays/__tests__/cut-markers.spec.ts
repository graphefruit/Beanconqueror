import { CutMarkersPlugin, dimBands } from '../cut-markers';
import { PluginChart } from './plugin-test-kit';

describe('cut markers', () => {
  it('dims the plot left and right of the cut', () => {
    expect(dimBands(30, 70, 10, 100)).toEqual([
      { x: 10, width: 20 },
      { x: 70, width: 40 },
    ]);
  });

  it('accepts the markers in either order and leaves out empty bands', () => {
    expect(dimBands(70, 30, 10, 100)).toEqual([
      { x: 10, width: 20 },
      { x: 70, width: 40 },
    ]);
    expect(dimBands(10, 110, 10, 100)).toEqual([]);
    expect(dimBands(-50, 500, 10, 100)).toEqual([]);
    expect(dimBands(50, 500, 10, 100)).toEqual([{ x: 10, width: 40 }]);
  });

  describe('on a chart', () => {
    let chart: PluginChart;
    let fills: number;
    let lines: number;

    beforeEach(() => {
      chart = new PluginChart(new CutMarkersPlugin());
      fills = 0;
      lines = 0;
      spyOn(CanvasRenderingContext2D.prototype, 'fillRect').and.callFake(() => {
        fills++;
      });
      spyOn(CanvasRenderingContext2D.prototype, 'setLineDash').and.callFake(
        () => {
          lines++;
        },
      );
    });

    afterEach(() => chart.destroy());

    it('draws the dimmed bands and dashed lines of the cut', async () => {
      await chart.mount('detail', [['live', 'weight']], true);
      fills = 0;
      lines = 0;
      chart.renderer.setCutMarkers([2, 8]);
      await chart.frame();

      expect(fills).toBe(2);
      expect(lines).toBeGreaterThan(0);

      fills = 0;
      chart.renderer.setCutMarkers(null);
      await chart.frame();
      expect(fills).toBe(0);
    });
  });
});
