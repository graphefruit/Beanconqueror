import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import {
  ESPRESSO_EXTRACTION_SCALE,
  EXTRACTION_CHART_MARGIN,
  extractionScaleFor,
  FILTER_EXTRACTION_SCALE,
  layoutExtractionChart,
  zoneLabelLines,
} from '../extraction-chart';

// A plot of 280 × 700 px: 20 px per yield percent; 1000 px per TDS percent
// for filter, about 58 px per TDS percent for espresso.
const WIDTH = 280 + 2 * EXTRACTION_CHART_MARGIN;
const HEIGHT = 700 + 2 * EXTRACTION_CHART_MARGIN;

describe('extraction chart', () => {
  it('uses the espresso scale only for espresso', () => {
    expect(extractionScaleFor(PREPARATION_STYLE_TYPE.ESPRESSO)).toBe(
      ESPRESSO_EXTRACTION_SCALE,
    );
    for (const style of [
      PREPARATION_STYLE_TYPE.POUR_OVER,
      PREPARATION_STYLE_TYPE.FULL_IMMERSION,
      PREPARATION_STYLE_TYPE.PERCOLATION,
      undefined,
    ]) {
      expect(extractionScaleFor(style)).toBe(FILTER_EXTRACTION_SCALE);
    }
  });

  it('places the filter ideal zone, the brew and the nine zone names', () => {
    const layout = layoutExtractionChart(
      FILTER_EXTRACTION_SCALE,
      WIDTH,
      HEIGHT,
      {
        yield: 22.5,
        tds: 1.35,
      },
    );

    expect(layout.transform).toBe('translate(45,45)');
    expect(layout.width).toBe(280);
    expect(layout.height).toBe(700);
    // Yield 19–24 %, TDS 1.25–1.5 %.
    const ideal = layout.ideal;
    expect(ideal.x).toBeCloseTo(100);
    expect(ideal.width).toBeCloseTo(100);
    expect(ideal.y).toBeCloseTo(300);
    expect(ideal.height).toBeCloseTo(250);
    expect(layout.point.x).toBeCloseTo(170);
    expect(layout.point.y).toBeCloseTo(450);
    expect(layout.zones.length).toBe(9);
    const ideallyNamed = layout.zones.find(
      (zone) => zone.key === 'EXTRACTION_CHART_LABEL_IDEAL',
    );
    expect(ideallyNamed.x).toBeCloseTo(150);
    expect(ideallyNamed.y).toBeCloseTo(400);
  });

  it('labels the axes like the former chart', () => {
    const layout = layoutExtractionChart(
      FILTER_EXTRACTION_SCALE,
      WIDTH,
      HEIGHT,
      {
        yield: 20,
        tds: 1.3,
      },
    );

    expect(layout.yieldTicks.map((tick) => tick.label)).toEqual([
      '15',
      '20',
      '25',
    ]);
    expect(layout.yieldTicks[0].x).toBeCloseTo(20);
    expect(layout.tdsTicks.map((tick) => tick.label)).toEqual([
      '1.1',
      '1.2',
      '1.3',
      '1.4',
      '1.5',
      '1.6',
      '1.7',
      '1.8',
    ]);
    expect(layout.tdsTicks[0].y).toBeCloseTo(700);
    expect(layout.tdsTicks[7].y).toBeCloseTo(0);
    expect(layout.yieldTickY).toBe(706);
    expect(layout.yieldTitle).toEqual({ x: 140, y: 740 });
    expect(layout.tdsTitleTransform).toBe('translate(-33,350) rotate(-90)');
  });

  it('places the espresso ideal zone and the brew without zone names', () => {
    const layout = layoutExtractionChart(
      ESPRESSO_EXTRACTION_SCALE,
      WIDTH,
      HEIGHT,
      { yield: 20, tds: 9 },
    );

    // Yield 18–22 %, TDS 8–12 % of 4–16 %.
    expect(layout.ideal.x).toBeCloseTo(80);
    expect(layout.ideal.width).toBeCloseTo(80);
    expect(layout.ideal.y).toBeCloseTo((4 / 12) * 700);
    expect(layout.ideal.height).toBeCloseTo((4 / 12) * 700);
    expect(layout.point.x).toBeCloseTo(120);
    expect(layout.point.y).toBeCloseTo((7 / 12) * 700);
    expect(layout.zones).toEqual([]);
    expect(layout.tdsTicks.map((tick) => tick.label)).toEqual([
      '4',
      '6',
      '8',
      '10',
      '12',
      '14',
      '16',
    ]);
  });

  it('leaves the point out when the brew has no extraction yield or TDS', () => {
    for (const brew of [
      { yield: Number.NaN, tds: 1.3 },
      { yield: 20, tds: Number.NaN },
    ]) {
      const layout = layoutExtractionChart(
        FILTER_EXTRACTION_SCALE,
        WIDTH,
        HEIGHT,
        brew,
      );
      expect(layout.point).toBeUndefined();
    }
  });

  it('keeps a point off the scale at its place, for the plot to clip', () => {
    const layout = layoutExtractionChart(
      FILTER_EXTRACTION_SCALE,
      WIDTH,
      HEIGHT,
      {
        yield: 30,
        tds: 2,
      },
    );

    expect(layout.point.x).toBeCloseTo(320);
    expect(layout.point.y).toBeCloseTo(-200);
  });

  it('has no layout while the box is too small for a plot', () => {
    const brew = { yield: 20, tds: 1.3 };
    const margins = 2 * EXTRACTION_CHART_MARGIN;
    expect(layoutExtractionChart(FILTER_EXTRACTION_SCALE, 0, 0, brew)).toBe(
      undefined,
    );
    expect(
      layoutExtractionChart(FILTER_EXTRACTION_SCALE, margins, HEIGHT, brew),
    ).toBe(undefined);
    expect(
      layoutExtractionChart(FILTER_EXTRACTION_SCALE, WIDTH, margins, brew),
    ).toBe(undefined);
  });

  it('splits zone names at their line breaks and centres the lines', () => {
    expect(zoneLabelLines('IDEAL')).toEqual([{ text: 'IDEAL', dy: '0.35em' }]);
    expect(zoneLabelLines('STERK <br> stram')).toEqual([
      { text: 'STERK', dy: '-0.25em' },
      { text: 'stram', dy: '1.2em' },
    ]);
    // The empty last line lifts the name to the height of two-line names.
    expect(zoneLabelLines('STRONG<br>')).toEqual([
      { text: 'STRONG', dy: '-0.25em' },
      { text: '', dy: '1.2em' },
    ]);
    expect(zoneLabelLines(undefined)).toEqual([{ text: '', dy: '0.35em' }]);
  });
});
