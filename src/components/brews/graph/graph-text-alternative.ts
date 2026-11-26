import { describeChart } from '../../../services/a11y/chart-text-alternative.service';
import type { FlowSeriesBuffer } from './flow-series-buffer';
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
