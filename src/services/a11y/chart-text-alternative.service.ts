import { inject, Service } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';
import { Chart, type Plugin } from 'chart.js';

/** The part of a Chart.js data set a text alternative needs. */
export interface ChartSeries {
  label?: string;
  data: readonly unknown[];
}

/** A series with this many values or fewer is read out value by value. */
export const MAX_LISTED_VALUES = 12;

type Texts = (key: string, params?: Record<string, string>) => string;

interface Point {
  label: string;
  value: number;
}

function labelText(label: unknown, language: string): string {
  if (Array.isArray(label)) {
    return label.map((part) => labelText(part, language)).join(' ');
  }
  if (label instanceof Date) {
    return label.toLocaleDateString(language);
  }
  return typeof label === 'string' || typeof label === 'number'
    ? String(label).trim()
    : '';
}

function pointsOf(
  series: ChartSeries,
  labels: readonly unknown[],
  language: string,
): Point[] {
  const points: Point[] = [];
  series.data.forEach((entry, index) => {
    const xy =
      entry !== null && typeof entry === 'object'
        ? (entry as { x?: unknown; y?: unknown })
        : undefined;
    const value = Number(xy ? xy.y : entry);
    if (entry === null || entry === undefined || !Number.isFinite(value)) {
      return;
    }
    const x = labels[index] ?? xy?.x;
    points.push({
      // Time axes give milliseconds.
      label:
        typeof x === 'number' && x > 1e11
          ? labelText(new Date(x), language)
          : labelText(x, language),
      value,
    });
  });
  return points;
}

/**
 * The text a screen reader says for a chart: its title, then for each series
 * its values, or, for a long series, how many there are, over which range and
 * the highest and lowest value. It replaces the picture, which screen readers
 * cannot read.
 */
export function describeChart(
  title: string,
  labels: readonly unknown[],
  series: readonly ChartSeries[],
  language: string,
  t: Texts,
): string {
  let format: Intl.NumberFormat;
  try {
    format = new Intl.NumberFormat(language.replace('_', '-'), {
      maximumFractionDigits: 2,
    });
  } catch {
    format = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });
  }
  const number = (value: number) => format.format(value);
  const parts: string[] = [];
  for (const each of series) {
    const points = pointsOf(each, labels, language);
    if (points.length === 0) {
      continue;
    }
    let values: string;
    if (points.length <= MAX_LISTED_VALUES) {
      values = points
        .map(({ label, value }) =>
          label ? `${label} ${number(value)}` : number(value),
        )
        .join(', ');
    } else {
      const highest = points.reduce((a, b) => (b.value > a.value ? b : a));
      const lowest = points.reduce((a, b) => (b.value < a.value ? b : a));
      values = t('A11Y.CHART_RANGE', {
        count: String(points.length),
        first: points[0].label,
        last: points[points.length - 1].label,
        max: number(highest.value),
        maxLabel: highest.label,
        min: number(lowest.value),
        minLabel: lowest.label,
      });
    }
    const name = (each.label ?? '').trim();
    parts.push(name ? `${name}: ${values}` : values);
  }
  if (parts.length === 0) {
    parts.push(t('A11Y.CHART_NO_DATA'));
  }
  return `${title || t('A11Y.CHART')}. ${parts.join('. ')}`;
}

/**
 * Gives every Chart.js chart of the app a text alternative: the canvas is an
 * image named by `describeChart`, updated whenever the chart is. The title is
 * the heading of the card the chart is in.
 */
@Service()
export class ChartTextAlternative {
  private readonly translate = inject(TranslateService);

  private readonly plugin: Plugin = {
    id: 'textAlternative',
    afterUpdate: (chart) => this.describe(chart),
  };

  public start(): void {
    Chart.register(this.plugin);
  }

  private describe(chart: Chart): void {
    const canvas = chart.canvas;
    const heading = canvas
      .closest('ion-card')
      ?.querySelector('[role="heading"], h1, h2, h3');
    const text = describeChart(
      heading?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      chart.data.labels ?? [],
      chart.data.datasets,
      this.translate.getCurrentLang() ?? 'en',
      (key, params) => String(this.translate.instant(key, params)),
    );
    canvas.setAttribute('role', 'img');
    if (canvas.getAttribute('aria-label') !== text) {
      canvas.setAttribute('aria-label', text);
    }
  }
}
