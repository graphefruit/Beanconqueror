import { Settings } from '../../../../../classes/settings/settings';
import { DEFAULT_GRAPH_COLORS } from '../../../../../data/defaultGraphColors';
import type { ChartMode } from '../../brew-chart-port';
import { FlowSeriesBuffer } from '../../flow-series-buffer';
import {
  fixedSeriesDef,
  type FixedSeriesId,
  type SeriesKind,
} from '../../series-def';
import { UplotRenderer } from '../../uplot-renderer';
import type { UplotOverlayPlugin } from '../uplot-plugin';

/** A real uPlot chart with one plugin, driven frame by frame. */
export class PluginChart {
  public readonly host = document.createElement('div');
  public readonly buffer = new FlowSeriesBuffer();
  public readonly renderer: UplotRenderer;
  private callbacks: FrameRequestCallback[] = [];

  constructor(plugin: UplotOverlayPlugin) {
    document.body.appendChild(this.host);
    this.renderer = new UplotRenderer([plugin], {
      requestFrame: (cb) => this.callbacks.push(cb),
      cancelFrame: () => (this.callbacks = []),
    });
  }

  public async mount(
    mode: ChartMode,
    series: [SeriesKind, FixedSeriesId][] = [
      ['live', 'weight'],
      ['live', 'pressure'],
    ],
    dark = false,
  ): Promise<void> {
    await this.renderer.mount(this.host, {
      width: 400,
      height: 200,
      dark,
      mode,
      axisSettings: new Settings(),
    });
    const colors = DEFAULT_GRAPH_COLORS;
    this.renderer.setSeries(
      series.map(([kind, id]) =>
        fixedSeriesDef(id, kind, colors, (key) => key),
      ),
    );
    for (let i = 0; i <= 100; i++) {
      this.buffer.append('weight', i / 10, i / 5);
      this.buffer.append('pressure', i / 10, 9);
    }
    this.renderer.attach(this.buffer);
    this.renderer.setReferences(this.buffer);
    await this.frame();
  }

  /** Runs the due frame and lets uPlot finish its (microtask) draw. */
  public async frame(): Promise<void> {
    const due = this.callbacks;
    this.callbacks = [];
    due.forEach((cb) => cb(performance.now()));
    await new Promise((resolve) => setTimeout(resolve));
  }

  public get over(): HTMLElement {
    return this.host.querySelector<HTMLElement>('.u-over');
  }

  public destroy(): void {
    this.renderer.destroy();
    this.host.remove();
  }
}
