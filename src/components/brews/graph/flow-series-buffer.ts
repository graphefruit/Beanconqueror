import type { BrewFlow, IBrewCustomAxis } from '../../../classes/brew/brewFlow';
import {
  customSeriesId,
  type CustomSeriesId,
  type FixedSeriesId,
  type SeriesId,
  type SeriesSource,
} from './series-def';

/** Read-only, non-copying window onto the samples of a series. */
export interface SeriesView {
  t: Float64Array;
  y: Float64Array;
}

/** Why a loaded brew has no graph. */
export type NoGraphReason =
  /** No file content, or none of the series has a sample. */
  | 'empty'
  /** There were samples, but none with a readable time and value. */
  | 'invalid';

export type LoadResult =
  | { hasGraph: true; skipped: number }
  | { hasGraph: false; reason: NoGraphReason; skipped: number };

interface SeriesStore {
  t: Float64Array;
  y: Float64Array;
  length: number;
}

type Sample = Record<string, unknown>;

/** What times a stored sample. */
export interface TimedSample {
  timestamp?: unknown;
  brew_time?: unknown;
}

/** Where the value of each fixed series sits in BrewFlow. */
const FIXED_SOURCES: readonly {
  id: FixedSeriesId;
  field: keyof BrewFlow;
  value: string;
}[] = [
  { id: 'weight', field: 'weight', value: 'actual_weight' },
  { id: 'weightSecond', field: 'weightSecond', value: 'actual_weight' },
  { id: 'flowPerSecond', field: 'waterFlow', value: 'value' },
  { id: 'realtimeFlow', field: 'realtimeFlow', value: 'flow_value' },
  {
    id: 'realtimeFlowSecond',
    field: 'realtimeFlowSecond',
    value: 'flow_value',
  },
  { id: 'pressure', field: 'pressureFlow', value: 'actual_pressure' },
  { id: 'temperature', field: 'temperatureFlow', value: 'actual_temperature' },
  { id: 'waterDispensed', field: 'waterDispensed', value: 'actual' },
  {
    id: 'waterDispensedFlowSecond',
    field: 'waterDispensedFlowSecond',
    value: 'actual',
  },
];

const DAY_SEC = 86400;

/** Seconds since midnight of an 'HH:mm:ss.SSS' timestamp, NaN when malformed. */
export function parseClockSeconds(timestamp: unknown): number {
  if (typeof timestamp !== 'string') {
    return Number.NaN;
  }
  const match = /^(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/.exec(
    timestamp.trim(),
  );
  if (!match) {
    return Number.NaN;
  }
  const millis = Number((match[4] ?? '0').padEnd(3, '0'));
  return (
    Number(match[1]) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3]) +
    millis / 1000
  );
}

/** A finite number from a stored value (imported files may hold strings), else NaN. */
function finite(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : Number.NaN;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

/**
 * Brew time of a sample in seconds: its timestamp relative to `start`, the
 * first sample's, as the detail graph does it. A brew past midnight wraps.
 * Without a readable timestamp the stored brew_time is the fallback; it is a
 * "second.tick" counter ("10.10" is tick 10 of second 10), so only a
 * fallback. NaN when neither can be read.
 */
export function sampleTime(sample: TimedSample, start: number): number {
  const clock = parseClockSeconds(sample.timestamp);
  if (Number.isFinite(clock) && Number.isFinite(start)) {
    const delta = clock - start;
    // Only a jump of more than half a day crosses midnight, either way: the
    // brew runs past it, or a series starts just before a first sample just
    // after it. A few ms before the first sample stay slightly negative.
    if (delta < -DAY_SEC / 2) {
      return delta + DAY_SEC;
    }
    return delta > DAY_SEC / 2 ? delta - DAY_SEC : delta;
  }
  return finite(sample.brew_time);
}

/** First index in ascending `x` whose value is >= `value`. */
export function lowerBound(x: ArrayLike<number>, value: number): number {
  let lo = 0;
  let hi = x.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (x[mid] < value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

function samplesOf(list: unknown): unknown[] {
  return Array.isArray(list) ? list : [];
}

function isSample(value: unknown): value is Sample {
  return value !== null && typeof value === 'object';
}

function isSorted(t: Float64Array, length: number): boolean {
  for (let i = 1; i < length; i++) {
    if (t[i] < t[i - 1]) {
      return false;
    }
  }
  return true;
}

/**
 * Growable column store for the brew graph, one series per id. Times are
 * seconds since the first sample and ascending within a series. `version`
 * changes with every change, so renderers can skip frames without news.
 * Several renderers may read the same buffer.
 */
export class FlowSeriesBuffer implements SeriesSource {
  private readonly series = new Map<SeriesId, SeriesStore>();
  private readonly axes = new Map<CustomSeriesId, IBrewCustomAxis>();
  private changes = 0;
  private clears = 0;
  /** Clock seconds of the brew's first sample; times count from it. */
  private start = Number.NaN;

  private readonly listeners = new Set<() => void>();

  constructor(private readonly initialCapacity = 256) {}

  /** Calls back on every change, until the returned function is called. */
  public onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private changed(): void {
    this.changes++;
    this.listeners.forEach((listener) => listener());
  }

  public get version(): number {
    return this.changes;
  }

  /** Changes when the content is dropped (clear, load), not when it grows. */
  public get generation(): number {
    return this.clears;
  }

  public seriesIds(): SeriesId[] {
    return [...this.series.keys()];
  }

  public has(id: SeriesId): boolean {
    return this.series.has(id);
  }

  /** The stored axis (name, unit, colours) of a custom series, if the file had one. */
  public customAxis(id: CustomSeriesId): IBrewCustomAxis | undefined {
    return this.axes.get(id);
  }

  public setCustomAxis(axis: IBrewCustomAxis): void {
    this.axes.set(customSeriesId(axis.key), axis);
    this.changed();
  }

  /** Appends a sample; the series is created on its first sample. */
  public append(id: SeriesId, t: number, y: number): void {
    const store = this.storeFor(id);
    if (store.length === store.t.length) {
      const capacity = Math.max(store.t.length * 2, 16);
      const t2 = new Float64Array(capacity);
      const y2 = new Float64Array(capacity);
      t2.set(store.t);
      y2.set(store.y);
      store.t = t2;
      store.y = y2;
    }
    store.t[store.length] = t;
    store.y[store.length] = y;
    store.length++;
    this.changed();
  }

  /**
   * Appends a sample as recorded in BrewFlow, timed like `load` times it: by
   * its timestamp, from the first sample of the brew. A sample without a
   * readable time or value is left out.
   */
  public appendSample(id: SeriesId, sample: TimedSample, value: number): void {
    if (!Number.isFinite(this.start)) {
      this.start = parseClockSeconds(sample.timestamp);
    }
    const t = sampleTime(sample, this.start);
    if (Number.isFinite(t) && Number.isFinite(value)) {
      this.append(id, t, value);
    }
  }

  /**
   * Replaces the value of the last sample of a series, as a machine does that
   * corrects its last flow value. Returns false when the series is empty.
   */
  public replaceLast(id: SeriesId, y: number): boolean {
    const store = this.series.get(id);
    if (!store || store.length === 0) {
      return false;
    }
    store.y[store.length - 1] = y;
    this.changed();
    return true;
  }

  public length(id: SeriesId): number {
    return this.series.get(id)?.length ?? 0;
  }

  /** Subarrays over the stored samples, valid until the next append. */
  public view(id: SeriesId): SeriesView {
    const store = this.series.get(id);
    if (!store) {
      return { t: new Float64Array(0), y: new Float64Array(0) };
    }
    return {
      t: store.t.subarray(0, store.length),
      y: store.y.subarray(0, store.length),
    };
  }

  /** Last sample time over all series, 0 when empty. */
  public endTime(): number {
    let end = 0;
    for (const store of this.series.values()) {
      if (store.length > 0) {
        end = Math.max(end, store.t[store.length - 1]);
      }
    }
    return end;
  }

  /** Drops all series, samples and custom axes. */
  public clear(): void {
    this.series.clear();
    this.axes.clear();
    this.start = Number.NaN;
    this.clears++;
    this.changed();
  }

  /**
   * Replaces the content with a saved brew. It never throws: samples without
   * a readable time or value are skipped and counted, and a brew without any
   * usable sample reports why there is no graph.
   */
  public load(flow: BrewFlow | null | undefined): LoadResult {
    this.clear();
    const record = (flow && typeof flow === 'object'
      ? flow
      : {}) as unknown as Record<string, unknown>;
    const metrics =
      record.customMetrics && typeof record.customMetrics === 'object'
        ? Object.entries(record.customMetrics as Record<string, unknown>)
        : [];
    const fixed = FIXED_SOURCES.map((source) => ({
      id: source.id,
      value: source.value,
      samples: samplesOf(record[source.field]),
    }));
    const custom = metrics.map(([key, list]) => ({
      id: customSeriesId(key),
      value: 'value',
      samples: samplesOf(list),
    }));
    const all = [...fixed, ...custom];
    const byId = new Map(all.map((s) => [s.id, s]));
    // GraphHelperService takes the first weight, pressure, temperature or
    // custom sample as zero; the other series only count when those are empty.
    const order = [
      byId.get('weight'),
      byId.get('pressure'),
      byId.get('temperature'),
      ...custom,
      ...fixed,
    ];
    const start =
      order
        .map((s) => s?.samples[0])
        .map((first) =>
          parseClockSeconds(isSample(first) ? first.timestamp : undefined),
        )
        .find((clock) => Number.isFinite(clock)) ?? Number.NaN;
    this.start = start;

    const axes = Array.isArray(record.customAxes)
      ? (record.customAxes as unknown[])
      : [];
    for (const axis of axes) {
      const candidate = axis as Partial<IBrewCustomAxis> | null;
      if (typeof candidate?.key === 'string') {
        this.axes.set(
          customSeriesId(candidate.key),
          candidate as IBrewCustomAxis,
        );
      }
    }

    let total = 0;
    let skipped = 0;
    for (const { id, value, samples } of all) {
      total += samples.length;
      for (const sample of samples) {
        const t = isSample(sample) ? sampleTime(sample, start) : Number.NaN;
        const y = isSample(sample) ? finite(sample[value]) : Number.NaN;
        if (Number.isFinite(t) && Number.isFinite(y)) {
          this.append(id, t, y);
        } else {
          skipped++;
        }
      }
      this.sortSeries(id);
    }
    this.changed();
    if (this.series.size > 0) {
      return { hasGraph: true, skipped };
    }
    return {
      hasGraph: false,
      reason: total > 0 ? 'invalid' : 'empty',
      skipped,
    };
  }

  /** Imported files may be out of order; renderers search by time. */
  private sortSeries(id: SeriesId): void {
    const store = this.series.get(id);
    if (!store || isSorted(store.t, store.length)) {
      return;
    }
    const order = Array.from({ length: store.length }, (_, i) => i).sort(
      (a, b) => store.t[a] - store.t[b] || a - b,
    );
    const t = Float64Array.from(order, (i) => store.t[i]);
    const y = Float64Array.from(order, (i) => store.y[i]);
    store.t.set(t);
    store.y.set(y);
  }

  private storeFor(id: SeriesId): SeriesStore {
    let store = this.series.get(id);
    if (!store) {
      store = {
        t: new Float64Array(this.initialCapacity),
        y: new Float64Array(this.initialCapacity),
        length: 0,
      };
      this.series.set(id, store);
    }
    return store;
  }
}
