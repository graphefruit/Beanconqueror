import { describeChart } from '../../../services/a11y/chart-text-alternative.service';
import type { FlowSeriesBuffer } from './flow-series-buffer';
import { nearestSample } from './overlays/cursor-labels';
import type { SeriesDef } from './series-def';
import { formatSeconds } from './uplot-renderer';

type Texts = (key: string, params?: Record<string, string>) => string;

/**
 * The text a screen reader gets for a brew graph, in the words of the other
 * charts (describeChart): per series its values at m:ss, or for a long one
 * the count, time span, highest and lowest value. The host puts it in the
 * aria-label of its role=img container, after the graph's name.
 */
export function describeFlowGraph(
  title: string,
  buffer: FlowSeriesBuffer,
  defs: readonly SeriesDef[],
  language: string,
  t: Texts,
): string {
  const series = defs
    .filter((def) => buffer.has(def.id))
    .map((def) => {
      const { t: times, y } = buffer.view(def.id);
      return {
        label: def.unit ? `${def.label} (${def.unit})` : def.label,
        data: Array.from(times, (time, i) => ({
          x: formatSeconds(time),
          y: y[i],
        })),
      };
    });
  return describeChart(title, [], series, language, t);
}

function oneDecimal(language: string): Intl.NumberFormat {
  const options = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
  try {
    return new Intl.NumberFormat(language.replace('_', '-'), options);
  } catch {
    return new Intl.NumberFormat('en', options);
  }
}

/**
 * What the time slider of a graph says: the time and the value at it of each
 * live series in `defs`, as the cursor labels draw them on the canvas, which
 * a screen reader cannot read, e.g. "12.0 s, Weight: 30.1 g".
 */
export function describeCursor(
  time: number,
  buffer: FlowSeriesBuffer,
  defs: readonly SeriesDef[],
  language: string,
): string {
  const number = oneDecimal(language);
  const parts = [`${number.format(time)} s`];
  for (const def of defs) {
    if (def.kind !== 'live') {
      continue;
    }
    const { t, y } = buffer.view(def.id);
    const i = nearestSample(t, y, time);
    if (i >= 0) {
      const unit = def.unit ? ` ${def.unit}` : '';
      parts.push(`${def.label}: ${number.format(y[i])}${unit}`);
    }
  }
  return parts.join(', ');
}
