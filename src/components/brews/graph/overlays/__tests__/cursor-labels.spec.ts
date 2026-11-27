import {
  contrastText,
  CursorLabelsPlugin,
  formatLabel,
  labelSide,
  layoutLabels,
  nearestSample,
  timeAtPixel,
} from '../cursor-labels';
import { PluginChart } from './plugin-test-kit';

describe('cursor labels', () => {
  describe('nearestSample', () => {
    it('picks the nearer neighbour of a sorted series', () => {
      const xs = [0, 1, 2, 3];
      const ys = [10, 11, 12, 13];
      expect(nearestSample(xs, ys, 1.4)).toBe(1);
      expect(nearestSample(xs, ys, 1.6)).toBe(2);
      expect(nearestSample(xs, ys, 1.5)).toBe(1);
      expect(nearestSample(xs, ys, -5)).toBe(0);
      expect(nearestSample(xs, ys, 99)).toBe(3);
    });

    it('skips NaN samples', () => {
      expect(nearestSample([0, 1, 2], [NaN, NaN, 7], 0)).toBe(2);
      expect(nearestSample([0, 1, 2], [7, NaN, NaN], 2)).toBe(0);
    });

    it('returns -1 without a finite sample', () => {
      expect(nearestSample([], [], 1)).toBe(-1);
      expect(nearestSample([0, 1], [NaN, NaN], 1)).toBe(-1);
    });
  });

  describe('layoutLabels', () => {
    it('keeps far-apart labels at their targets', () => {
      expect(layoutLabels([200, 50], 0, 400)).toEqual([200, 50]);
    });

    it('pushes overlapping labels down by the minimum gap, in input order', () => {
      expect(layoutLabels([110, 100, 105], 0, 400)).toEqual([156, 100, 128]);
    });

    it('packs labels upwards from the bottom edge', () => {
      expect(layoutLabels([390, 395], 0, 380)).toEqual([352, 380]);
    });

    it('keeps the top edge when the plot is too small for all labels', () => {
      const ys = layoutLabels([10, 10, 10], 15, 50);
      expect(ys).toEqual([15, 43, 71]);
    });

    it('handles no labels', () => {
      expect(layoutLabels([], 0, 100)).toEqual([]);
    });
  });

  it('flips labels to the left past 70 % of the plot', () => {
    expect(labelSide(170, 100, 100)).toBe('right');
    expect(labelSide(171, 100, 100)).toBe('left');
  });

  it('chooses black text on light and white text on dark colours', () => {
    expect(contrastText('#ffff00')).toBe('#000000');
    expect(contrastText('#fff')).toBe('#000000');
    expect(contrastText('rgba(20, 20, 20, 0.5)')).toBe('#ffffff');
    expect(contrastText('#123456')).toBe('#ffffff');
    expect(contrastText(undefined)).toBe('#ffffff');
  });

  it('maps a pointer x to a clamped time', () => {
    expect(timeAtPixel(50, 200, 10, 30)).toBe(15);
    expect(timeAtPixel(-20, 200, 10, 30)).toBe(10);
    expect(timeAtPixel(500, 200, 10, 30)).toBe(30);
    expect(timeAtPixel(5, 0, 10, 30)).toBe(10);
  });

  it('formats a label with the unit of its series', () => {
    expect(formatLabel('Weight', 18.26, 'g')).toBe('Weight: 18.3 g');
    expect(formatLabel('TDS', 1, '')).toBe('TDS: 1.0');
  });

  describe('on a chart', () => {
    let chart: PluginChart;
    let texts: string[];
    let onCursorDrag: jasmine.Spy;

    beforeEach(() => {
      onCursorDrag = jasmine.createSpy('onCursorDrag');
      chart = new PluginChart(new CursorLabelsPlugin({ onCursorDrag }));
      texts = [];
      spyOn(CanvasRenderingContext2D.prototype, 'fillText').and.callFake(
        (text: string) => {
          texts.push(text);
        },
      );
    });

    afterEach(() => chart.destroy());

    it('labels the shown live series at the cursor, not the reference', async () => {
      await chart.mount('detail', [
        ['reference', 'weight'],
        ['live', 'weight'],
        ['live', 'pressure'],
      ]);
      texts = [];
      chart.renderer.setCursor(5);
      await chart.frame();

      expect(texts.filter((t) => t.includes(': '))).toEqual([
        'BREW_FLOW_WEIGHT: 10.0 g',
        'BREW_PRESSURE_FLOW: 9.0 bar',
      ]);
    });

    it('labels a cursor right of 70 % on the left side too', async () => {
      await chart.mount('detail');
      texts = [];
      chart.renderer.setCursor(9);
      await chart.frame();

      expect(texts).toContain('BREW_FLOW_WEIGHT: 18.0 g');
    });

    it('draws nothing without a cursor or outside the time axis', async () => {
      await chart.mount('detail');
      texts = [];
      chart.renderer.setCursor(500);
      await chart.frame();

      expect(texts.filter((t) => t.includes(': '))).toEqual([]);
    });

    it('moves the cursor with a drag in detail mode', async () => {
      await chart.mount('detail');
      const over = chart.over;
      const rect = over.getBoundingClientRect();
      const at = (fraction: number) => rect.left + rect.width * fraction;

      over.dispatchEvent(
        new PointerEvent('pointerdown', { pointerId: 1, clientX: at(0.5) }),
      );
      over.dispatchEvent(
        new PointerEvent('pointermove', { pointerId: 1, clientX: at(0.25) }),
      );
      over.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
      over.dispatchEvent(
        new PointerEvent('pointermove', { pointerId: 1, clientX: at(0.75) }),
      );

      expect(
        onCursorDrag.calls.allArgs().map(([t]) => Math.round(t * 10) / 10),
      ).toEqual([5, 2.5]);
      expect(over.style.touchAction).toBe('pan-y');
    });

    it('leaves the pointer alone outside detail mode', async () => {
      await chart.mount('static');
      chart.over.dispatchEvent(
        new PointerEvent('pointerdown', { pointerId: 1, clientX: 10 }),
      );

      expect(onCursorDrag).not.toHaveBeenCalled();
    });
  });
});
