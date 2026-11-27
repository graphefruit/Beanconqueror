import { PREPARATION_STYLE_TYPE } from 'src/enums/preparations/preparationStyleTypes';

/** A zone name of the chart, centred on a point in data units. */
export interface ExtractionZone {
  key: string;
  yield: number;
  tds: number;
}

/** Ranges, ideal zone and zone names of one chart (as the brew control chart has them). */
export interface ExtractionChartScale {
  yieldRange: readonly [number, number];
  tdsRange: readonly [number, number];
  yieldTicks: readonly number[];
  tdsTicks: readonly number[];
  tdsDecimals: number;
  idealYield: readonly [number, number];
  idealTds: readonly [number, number];
  zones: readonly ExtractionZone[];
}

export const FILTER_EXTRACTION_SCALE: ExtractionChartScale = {
  yieldRange: [14, 28],
  tdsRange: [1.1, 1.8],
  yieldTicks: [15, 20, 25],
  tdsTicks: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8],
  tdsDecimals: 1,
  idealYield: [19, 24],
  idealTds: [1.25, 1.5],
  zones: [
    {
      key: 'EXTRACTION_CHART_LABEL_STRONG_UNDEREXTRACTED',
      yield: 17,
      tds: 1.72,
    },
    { key: 'EXTRACTION_CHART_LABEL_STRONG', yield: 21.5, tds: 1.72 },
    { key: 'EXTRACTION_CHART_LABEL_STRONG_HARSH', yield: 26, tds: 1.72 },
    { key: 'EXTRACTION_CHART_LABEL_UNDEREXTRACTED', yield: 17, tds: 1.4 },
    { key: 'EXTRACTION_CHART_LABEL_IDEAL', yield: 21.5, tds: 1.4 },
    { key: 'EXTRACTION_CHART_LABEL_HARSH', yield: 26, tds: 1.4 },
    { key: 'EXTRACTION_CHART_LABEL_WEAK_UNDEREXTRACTED', yield: 17, tds: 1.15 },
    { key: 'EXTRACTION_CHART_LABEL_WEAK', yield: 21.5, tds: 1.15 },
    { key: 'EXTRACTION_CHART_LABEL_WEAK_HARSH', yield: 26, tds: 1.15 },
  ],
};

/** Espresso has its own ideal zone and no zone names. */
export const ESPRESSO_EXTRACTION_SCALE: ExtractionChartScale = {
  yieldRange: [14, 28],
  tdsRange: [4, 16],
  yieldTicks: [15, 20, 25],
  tdsTicks: [4, 6, 8, 10, 12, 14, 16],
  tdsDecimals: 0,
  idealYield: [18, 22],
  idealTds: [8, 12],
  zones: [],
};

export function extractionScaleFor(
  _styleType: PREPARATION_STYLE_TYPE | undefined,
): ExtractionChartScale {
  return _styleType === PREPARATION_STYLE_TYPE.ESPRESSO
    ? ESPRESSO_EXTRACTION_SCALE
    : FILTER_EXTRACTION_SCALE;
}

/** Space around the plot for ticks and axis titles, in CSS pixels. */
export const EXTRACTION_CHART_MARGIN = 45;

export interface ExtractionChartLayout {
  /** Moves the plot's top left corner to its place in the chart. */
  transform: string;
  width: number;
  height: number;
  /** Everything below is relative to the plot's top left corner. */
  yieldTitle: { x: number; y: number };
  tdsTitleTransform: string;
  yieldTickY: number;
  yieldTicks: { x: number; label: string }[];
  tdsTicks: { y: number; label: string }[];
  ideal: { x: number; y: number; width: number; height: number };
  zones: { key: string; x: number; y: number }[];
  /** Absent when the brew has no extraction yield or TDS. */
  point?: { x: number; y: number };
}

/** Places the chart in a box of the given size; undefined while the box is too small for a plot. */
export function layoutExtractionChart(
  _scale: ExtractionChartScale,
  _width: number,
  _height: number,
  _brew: { yield: number; tds: number },
): ExtractionChartLayout | undefined {
  const width = _width - 2 * EXTRACTION_CHART_MARGIN;
  const height = _height - 2 * EXTRACTION_CHART_MARGIN;
  if (!(width > 0 && height > 0)) {
    return undefined;
  }
  const [yieldMin, yieldMax] = _scale.yieldRange;
  const [tdsMin, tdsMax] = _scale.tdsRange;
  const x = (_yield: number) =>
    ((_yield - yieldMin) / (yieldMax - yieldMin)) * width;
  const y = (_tds: number) => ((tdsMax - _tds) / (tdsMax - tdsMin)) * height;
  const [idealYieldMin, idealYieldMax] = _scale.idealYield;
  const [idealTdsMin, idealTdsMax] = _scale.idealTds;
  const hasPoint = Number.isFinite(_brew.yield) && Number.isFinite(_brew.tds);
  return {
    transform: `translate(${EXTRACTION_CHART_MARGIN},${EXTRACTION_CHART_MARGIN})`,
    width,
    height,
    yieldTitle: { x: width / 2, y: height + 40 },
    tdsTitleTransform: `translate(-33,${height / 2}) rotate(-90)`,
    yieldTickY: height + 6,
    yieldTicks: _scale.yieldTicks.map((value) => ({
      x: x(value),
      label: String(value),
    })),
    tdsTicks: _scale.tdsTicks.map((value) => ({
      y: y(value),
      label: value.toFixed(_scale.tdsDecimals),
    })),
    ideal: {
      x: x(idealYieldMin),
      y: y(idealTdsMax),
      width: x(idealYieldMax) - x(idealYieldMin),
      height: y(idealTdsMin) - y(idealTdsMax),
    },
    zones: _scale.zones.map((zone) => ({
      key: zone.key,
      x: x(zone.yield),
      y: y(zone.tds),
    })),
    point: hasPoint ? { x: x(_brew.yield), y: y(_brew.tds) } : undefined,
  };
}

const LINE_HEIGHT_EM = 1.2;
/** Moves a baseline down to put the middle of a line on its point. */
const CENTRE_EM = 0.35;

/**
 * The lines of a translated zone name, which breaks lines with "<br>", each with
 * its shift from the line before, so the block is centred on the zone's point.
 * An empty last line is kept: it lifts "STRONG<br>" to the height of its neighbours.
 */
export function zoneLabelLines(
  _text: string | undefined,
): { text: string; dy: string }[] {
  const lines = (_text ?? '').split(/<br\s*\/?>/i);
  const first = CENTRE_EM - ((lines.length - 1) * LINE_HEIGHT_EM) / 2;
  return lines.map((line, index) => ({
    text: line.trim(),
    dy: `${index === 0 ? first : LINE_HEIGHT_EM}em`,
  }));
}
