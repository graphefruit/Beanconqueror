import {
  formatValue,
  layoutRows,
  LiveAnnotationsPlugin,
  spreadVertically,
  valueNear,
} from '../live-annotations';
import { PluginChart } from './plugin-test-kit';

describe('live annotations', () => {
  describe('layoutRows', () => {
    it('keeps separate labels in the first row', () => {
      expect(
        layoutRows(
          [
            { x: 0, w: 40 },
            { x: 50, w: 40 },
          ],
          4,
          3,
        ),
      ).toEqual([0, 0]);
    });

    it('stacks colliding labels and reuses a row once it is free', () => {
      expect(
        layoutRows(
          [
            { x: 30, w: 40 },
            { x: 0, w: 40 },
            { x: 50, w: 40 },
          ],
          4,
          3,
        ),
      ).toEqual([1, 0, 0]);
    });

    it('overlaps in the row that frees up first when all rows are taken', () => {
      expect(
        layoutRows(
          [
            { x: 0, w: 100 },
            { x: 1, w: 10 },
            { x: 2, w: 100 },
          ],
          4,
          2,
        ),
      ).toEqual([0, 1, 1]);
    });
  });

  describe('spreadVertically', () => {
    it('leaves non-overlapping boxes alone', () => {
      expect(spreadVertically([10, 50], 20, 0, 100)).toEqual([10, 50]);
    });

    it('pushes overlapping boxes apart in input order', () => {
      expect(spreadVertically([30, 20], 20, 0, 100)).toEqual([40, 20]);
    });

    it('shifts boxes back up from the bottom edge', () => {
      expect(spreadVertically([90, 95], 20, 0, 100)).toEqual([60, 80]);
    });

    it('keeps boxes inside the top edge', () => {
      expect(spreadVertically([-10], 20, 0, 100)).toEqual([0]);
    });
  });

  describe('valueNear', () => {
    it('takes the nearest finite sample', () => {
      expect(valueNear([0, 1, 2], [5, NaN, 7], 1.2)).toBe(7);
      expect(valueNear([0, 1, 2], [5, NaN, 7], 0.9)).toBe(5);
      expect(valueNear([0, 1], [NaN, NaN], 0)).toBeNull();
      expect(valueNear([], [], 0)).toBeNull();
    });
  });

  it('formats a badge value', () => {
    expect(formatValue(12.345)).toBe('12.3');
    expect(formatValue(123.4)).toBe('123');
    expect(formatValue(-150)).toBe('-150');
  });

  describe('on a chart', () => {
    let chart: PluginChart;
    let texts: string[];

    beforeEach(() => {
      chart = new PluginChart(new LiveAnnotationsPlugin());
      texts = [];
      spyOn(CanvasRenderingContext2D.prototype, 'fillText').and.callFake(
        (text: string) => {
          texts.push(text);
        },
      );
    });

    afterEach(() => chart.destroy());

    it('draws event lines, value lines and badges with their labels', async () => {
      await chart.mount('detail');
      texts = [];
      chart.renderer.setAnnotations([
        { kind: 'vline', t: 2, label: 'First drip', colour: '#111111' },
        { kind: 'vline', t: 2.1, label: 'Bloom', colour: '#111111' },
        { kind: 'vline', t: 9.9, label: 'Near the end', colour: '#111111' },
        { kind: 'vline', t: 500, label: 'Outside', colour: '#111111' },
        { kind: 'vline', label: 'No time', colour: '#111111' },
        {
          kind: 'hline',
          y: 9,
          axisId: 'pressure',
          label: 'Target',
          colour: '#222222',
        },
        { kind: 'hline', y: 10, colour: '#222222', label: '' },
        {
          kind: 'hline',
          y: 10,
          axisId: 'water',
          label: 'No axis',
          colour: '#222222',
        },
        {
          kind: 'hline',
          y: 9000,
          axisId: 'pressure',
          label: 'Too high',
          colour: '#222222',
        },
        {
          kind: 'pointLabel',
          seriesId: 'weight',
          label: '',
          colour: '#333333',
        },
        {
          kind: 'pointLabel',
          seriesId: 'pressure',
          t: 5,
          label: 'At 5 s',
          colour: '#333333',
        },
        {
          kind: 'pointLabel',
          seriesId: 'weight',
          t: 5,
          y: 3,
          label: 'Given',
          colour: '#333333',
        },
        {
          kind: 'pointLabel',
          seriesId: 'temperature',
          label: 'Not drawn',
          colour: '#333333',
        },
        {
          kind: 'pointLabel',
          seriesId: 'weight',
          t: 500,
          label: 'Outside',
          colour: '#333333',
        },
      ]);
      await chart.frame();

      expect(texts).toContain('First drip');
      expect(texts).toContain('Bloom');
      expect(texts).toContain('Near the end');
      expect(texts).toContain('Target');
      expect(texts).toContain('20.0');
      expect(texts).toContain('At 5 s');
      expect(texts).toContain('Given');
      expect(texts).not.toContain('Outside');
      expect(texts).not.toContain('No time');
      expect(texts).not.toContain('No axis');
      expect(texts).not.toContain('Too high');
      expect(texts).not.toContain('Not drawn');
    });

    it('draws nothing without annotations', async () => {
      await chart.mount('live');
      texts = [];
      chart.renderer.setAnnotations([]);
      await chart.frame();

      expect(texts.filter((t) => /[a-z]/i.test(t))).toEqual([]);
    });

    it('skips a badge that follows a series without samples', async () => {
      await chart.mount('live');
      chart.buffer.clear();
      texts = [];
      chart.renderer.setAnnotations([
        {
          kind: 'pointLabel',
          seriesId: 'weight',
          label: 'Last',
          colour: '#333333',
        },
      ]);
      await chart.frame();

      expect(texts).not.toContain('Last');
    });
  });
});
