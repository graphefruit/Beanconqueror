import type uPlot from 'uplot';

import { Settings } from '../../../../classes/settings/settings';
import { DEFAULT_GRAPH_COLORS } from '../../../../data/defaultGraphColors';
import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import { contrastRatio } from '../../../../services/graphHelper/line-contrast';
import type { ChartMode } from '../brew-chart-port';
import { FlowSeriesBuffer } from '../flow-series-buffer';
import type {
  UplotOverlayPlugin,
  UplotOverlayState,
} from '../overlays/uplot-plugin';
import {
  customSeriesDef,
  fixedSeriesDef,
  type FixedSeriesId,
  type SeriesDef,
  type SeriesKind,
} from '../series-def';
import {
  axisShown,
  CHART_PALETTE,
  formatSeconds,
  layoutSeries,
  liveTimeRange,
  loadUplot,
  UplotRenderer,
  viewportRange,
} from '../uplot-renderer';

class FakeFrames {
  private callbacks: FrameRequestCallback[] = [];
  public readonly request = (cb: FrameRequestCallback): number => {
    this.callbacks.push(cb);
    return this.callbacks.length;
  };
  public readonly cancel = (): void => {
    this.callbacks = [];
  };
  public get pending(): number {
    return this.callbacks.length;
  }
  /** Runs the due frame and lets uPlot finish its (microtask) draw. */
  public async run(): Promise<void> {
    const due = this.callbacks;
    this.callbacks = [];
    due.forEach((cb) => cb(performance.now()));
    await new Promise((resolve) => setTimeout(resolve));
  }
}

const COLORS = DEFAULT_GRAPH_COLORS;
const translate = (key: string): string => key;

function defs(kind: SeriesKind, ...ids: FixedSeriesId[]): SeriesDef[] {
  return ids.map((id) => fixedSeriesDef(id, kind, COLORS, translate));
}

function feed(buffer: FlowSeriesBuffer, fromSec: number, toSec: number): void {
  for (let k = Math.round(fromSec * 10); k < toSec * 10; k++) {
    buffer.append('weight', k / 10, k / 10);
  }
  for (let k = Math.round(fromSec * 14); k < toSec * 14; k++) {
    buffer.append('pressure', k / 14, 9);
  }
}

class Probe implements UplotOverlayPlugin {
  public draws = 0;
  public states: UplotOverlayState[] = [];
  public hooks(): uPlot.Plugin {
    return { hooks: { draw: [() => this.draws++] } };
  }
  public apply(state: UplotOverlayState): void {
    this.states.push(state);
  }
  public get last(): UplotOverlayState {
    return this.states[this.states.length - 1];
  }
}

/** Records the theme the overlays had at each draw. */
class ThemeProbe implements UplotOverlayPlugin {
  public dark = false;
  public readonly drawnDark: boolean[] = [];
  public hooks(): uPlot.Plugin {
    return { hooks: { draw: [() => this.drawnDark.push(this.dark)] } };
  }
  public apply(state: UplotOverlayState): void {
    this.dark = state.dark;
  }
}

describe('UplotRenderer', () => {
  let host: HTMLDivElement;
  let frames: FakeFrames;
  let renderer: UplotRenderer;
  let buffer: FlowSeriesBuffer;
  let probe: Probe;

  async function mount(mode: ChartMode = 'live', dark = false): Promise<void> {
    probe = new Probe();
    renderer = new UplotRenderer([probe], {
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
    });
    await renderer.mount(host, {
      width: 400,
      height: 200,
      dark,
      mode,
      axisSettings: new Settings(),
      style: PREPARATION_STYLE_TYPE.ESPRESSO,
    });
    renderer.setSeries(defs('live', 'weight', 'pressure'));
    renderer.attach(buffer);
  }

  const plot = (): uPlot => (renderer as unknown as { u: uPlot }).u;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    frames = new FakeFrames();
    buffer = new FlowSeriesBuffer();
  });

  afterEach(() => {
    renderer?.destroy();
    host.remove();
  });

  it('draws once per frame for many appends and requests no idle frames', async () => {
    await mount();
    feed(buffer, 0, 1);
    await frames.run();
    const afterBuild = probe.draws;
    expect(frames.pending).toBe(0);

    feed(buffer, 1, 30);
    expect(probe.draws).toBe(afterBuild);
    expect(frames.pending).toBe(1);
    await frames.run();
    expect(probe.draws).toBe(afterBuild + 1);
    expect(frames.pending).toBe(0);
  });

  it('requests no frames while the live graph is hidden and draws once it has a size', async () => {
    await mount();
    feed(buffer, 0, 1);
    await frames.run();
    renderer.resize(0, 200);
    await frames.run();
    const draws = probe.draws;

    feed(buffer, 1, 2);
    await frames.run();
    expect(frames.pending).toBe(0);
    expect(probe.draws).toBe(draws);

    renderer.resize(400, 200);
    await frames.run();
    expect(probe.draws).toBe(draws + 1);
    expect(plot().width).toBe(400);
  });

  it('wakes up for a change of the reference buffer', async () => {
    await mount();
    const reference = new FlowSeriesBuffer();
    renderer.setReferences(reference);
    await frames.run();

    reference.append('weight', 0, 1);
    expect(frames.pending).toBe(1);
  });

  it('draws new samples at most once per interval, a change at once', async () => {
    let now = 0;
    const due: FrameRequestCallback[] = [];
    const tick = async (ms: number): Promise<void> => {
      now += ms;
      due.splice(0).forEach((cb) => cb(now));
      await new Promise((resolve) => setTimeout(resolve));
    };
    probe = new Probe();
    renderer = new UplotRenderer([probe], {
      requestFrame: (cb) => due.push(cb),
      cancelFrame: () => due.splice(0),
      minDrawIntervalMs: 100,
    });
    await renderer.mount(host, {
      width: 400,
      height: 200,
      dark: false,
      mode: 'live',
      axisSettings: new Settings(),
      style: PREPARATION_STYLE_TYPE.ESPRESSO,
    });
    renderer.setSeries(defs('live', 'weight'));
    renderer.attach(buffer);
    await tick(16);
    const afterBuild = probe.draws;

    feed(buffer, 0, 1);
    await tick(16);
    await tick(16);
    expect(probe.draws).toBe(afterBuild);
    await tick(80);
    expect(probe.draws).toBe(afterBuild + 1);

    renderer.setVisible('weight', false);
    await tick(16);
    expect(probe.draws).toBe(afterBuild + 2);
  });

  it('hides canvas and axes from screen readers and shows no legend', async () => {
    await mount();
    feed(buffer, 0, 2);
    await frames.run();

    const root = host.querySelector('.uplot');
    expect(root?.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('.u-legend')).toBeNull();
    expect(host.querySelectorAll('canvas').length).toBe(1);
  });

  it('gives every series its own x (mode 2) and hands uPlot only the visible range', async () => {
    await mount();
    renderer.setViewport({ mode: 'range', from: 10, to: 20 });
    feed(buffer, 0, 30);
    await frames.run();

    const u = plot();
    expect(u.data[0]).toBeNull();
    expect(u.scales.x.min).toBe(10);
    expect(u.scales.x.max).toBe(20);
    const weight = u.data[1] as unknown as [Float64Array, Float64Array];
    expect(weight[0].length).toBeLessThan(buffer.length('weight'));
  });

  it('grows the live window from 0 with the brew and counts in m:ss steps', async () => {
    await mount();
    renderer.setViewport({ mode: 'grow', startSec: 20 });
    feed(buffer, 0, 120);
    await frames.run();

    const u = plot();
    const end = buffer.endTime();
    expect(u.scales.x.min).toBe(0);
    expect(u.scales.x.max).toBeCloseTo(end * 1.25, 6);
    // The whole brew stays in the picture.
    const weight = u.data[1] as unknown as [Float64Array, Float64Array];
    expect(weight[0].length).toBe(buffer.length('weight'));
    const splits = (u.axes[0] as unknown as { _splits: number[] })._splits;
    // uPlot's own steps would label 0:20, 0:40 … here.
    expect(splits.every((t) => t % 15 === 0)).toBeTrue();
  });

  it('grows the live axes with live samples only, starting from the settings', async () => {
    await mount();
    const reference = new FlowSeriesBuffer();
    reference.append('weight', 0, 0);
    reference.append('weight', 100, 500);
    renderer.setSeries([
      ...defs('reference', 'weight'),
      ...defs('live', 'weight', 'pressure'),
    ]);
    renderer.setReferences(reference);
    feed(buffer, 0, 3);
    await frames.run();
    expect(plot().scales.weight.max).toBe(50);
    expect(plot().scales.pressure.max).toBe(9);

    buffer.append('weight', 3, 49.5);
    buffer.append('pressure', 3, 9.5);
    await frames.run();
    expect(plot().scales.weight.max).toBeCloseTo(61.875, 6);
    expect(plot().scales.pressure.max).toBe(11);
  });

  it('starts over when the live buffer is cleared', async () => {
    await mount();
    buffer.append('weight', 0, 80);
    await frames.run();
    expect(plot().scales.weight.max).toBe(100);

    buffer.clear();
    buffer.append('weight', 0, 1);
    await frames.run();
    expect(plot().scales.weight.max).toBe(50);
  });

  it('fits a saved brew and its reference in detail mode, without hidden series', async () => {
    await mount('detail');
    const reference = new FlowSeriesBuffer();
    reference.append('weight', 0, 0);
    reference.append('weight', 50, 100);
    renderer.setSeries([
      ...defs('reference', 'weight'),
      ...defs('live', 'weight', 'pressure'),
    ]);
    renderer.setReferences(reference);
    feed(buffer, 0, 10);
    renderer.attach(buffer);
    await frames.run();

    expect(plot().scales.x.max).toBe(50);
    expect(plot().scales.weight.max).toBe(105);
    expect(plot().scales.pressure.max).toBe(10);
    expect(
      plot()
        .series.slice(1)
        .map((s) => s.label),
    ).toEqual(['BREW_FLOW_WEIGHT', 'BREW_FLOW_WEIGHT', 'BREW_PRESSURE_FLOW']);

    renderer.setVisible('weight', false);
    await frames.run();
    expect(plot().series[1].show).toBeFalse();
    expect(plot().series[2].show).toBeFalse();
    expect(plot().axes[1].show).toBeFalse();
    expect(plot().axes[2].show).toBeTrue();
  });

  it('keeps temperature and water axes bare in the live graph, as today', async () => {
    await mount();
    renderer.setSeries(defs('live', 'weight', 'temperature'));
    buffer.append('weight', 0, 1);
    buffer.append('temperature', 0, 93);
    await frames.run();

    expect(plot().axes[1].show).toBeTrue();
    expect(plot().axes[2].show).toBeFalse();
    expect(plot().series[2].show).toBeTrue();
  });

  it('redraws in the other theme when the app theme changes', async () => {
    await mount('detail');
    feed(buffer, 0, 2);
    renderer.attach(buffer);
    await frames.run();
    const weight = fixedSeriesDef('weight', 'live', COLORS, translate);
    expect(plot().series[1].stroke).toBeDefined();
    expect(seriesStroke(plot(), 1)).toBe(weight.colour.light);

    renderer.setDark(true);
    await frames.run();

    expect(seriesStroke(plot(), 1)).toBe(weight.colour.dark);
    expect(probe.last.dark).toBeTrue();
    expect(host.querySelectorAll('.uplot').length).toBe(1);
  });

  it('rebuilds once when a custom axis comes in and keeps the data', async () => {
    await mount();
    feed(buffer, 0, 5);
    await frames.run();
    const custom = customSeriesDef(
      {
        key: 'extra',
        name: 'Extra',
        unit: 'u',
        colorLight: '#123456',
        colorDark: '#abcdef',
      },
      'live',
      COLORS,
      translate,
    );
    buffer.append(custom.id, 1, 3);
    renderer.setSeries([...defs('live', 'weight', 'pressure'), custom]);
    await frames.run();

    expect(host.querySelectorAll('.uplot').length).toBe(1);
    expect(Object.keys(plot().scales)).toContain('custom:extra');
    expect(plot().scales.weight.max).toBe(50);
  });

  it('passes overlay state to the plugins before drawing', async () => {
    await mount();
    feed(buffer, 0, 2);
    renderer.setCursor(1.5);
    renderer.setCutMarkers([0.5, 1]);
    renderer.setAnnotations([
      { kind: 'vline', t: 1, label: 'Drip', colour: '#000' },
    ]);
    await frames.run();

    const state = probe.last;
    expect(state.cursor).toBe(1.5);
    expect(state.cut).toEqual([0.5, 1]);
    expect(state.annotations.length).toBe(1);
    expect(state.mode).toBe('live');
    expect(state.scaleOf('pressure')).toBe('pressure');
    expect(state.scaleOf('water')).toBeUndefined();
    expect(state.seriesIndexOf('weight')).toBe(1);
    expect(state.seriesIndexOf('weight', 'reference')).toBeUndefined();
    expect(state.defAt(2)?.id).toBe('pressure');
    expect(state.lastSample('weight')?.t).toBeCloseTo(1.9, 6);
    expect(state.lastSample('temperature')).toBeNull();
  });

  it('resizes on the next frame, once for several calls, and waits for a size', async () => {
    await mount();
    feed(buffer, 0, 1);
    await frames.run();
    const setSize = spyOn(plot(), 'setSize').and.callThrough();

    renderer.resize(300, 100);
    renderer.resize(320.6, 160);
    expect(setSize).not.toHaveBeenCalled();
    await frames.run();
    expect(setSize).toHaveBeenCalledOnceWith({ width: 320, height: 160 });
    expect(plot().width).toBe(320);

    renderer.resize(0, 160);
    const draws = probe.draws;
    await frames.run();
    expect(probe.draws).toBe(draws);
  });

  it('draws nothing before it has a size', async () => {
    probe = new Probe();
    renderer = new UplotRenderer([probe], {
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
    });
    await renderer.mount(host, {
      width: 0,
      height: 150,
      dark: false,
      mode: 'static',
      axisSettings: new Settings(),
    });
    renderer.setSeries(defs('live', 'weight'));
    buffer.append('weight', 0, 1);
    renderer.attach(buffer);
    await frames.run();
    expect(host.querySelector('.uplot')).toBeNull();

    renderer.resize(300, 150);
    await frames.run();
    expect(host.querySelector('.uplot')).not.toBeNull();
    // A saved brew does not keep a frame loop running.
    expect(frames.pending).toBe(0);
  });

  it('keeps a size its container reports while uPlot still loads', async () => {
    renderer = new UplotRenderer([], {
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
    });
    // Measured while the container was still hidden.
    const mounting = renderer.mount(host, {
      width: 0,
      height: 150,
      dark: false,
      mode: 'live',
      axisSettings: new Settings(),
      style: PREPARATION_STYLE_TYPE.ESPRESSO,
    });
    // The container shows up before the library is there.
    renderer.resize(360, 150);
    await mounting;
    renderer.setSeries(defs('live', 'weight'));
    renderer.attach(buffer);
    await frames.run();

    expect(plot()?.width).toBe(360);
  });

  it('shows grid and weight axis of the live graph before the first sample', async () => {
    await mount();
    await frames.run();

    expect(plot().axes[1].show).withContext('weight axis').toBeTrue();
    expect(plot().axes[2].show).withContext('pressure axis').toBeFalse();
    expect(plot().scales.weight.max).toBe(
      new Settings().graph_weight.ESPRESSO.upper,
    );
  });

  it('shows no axis of a saved brew without data', async () => {
    await mount('detail');
    await frames.run();

    expect(plot().axes[1].show).toBeFalse();
  });

  it('writes the axis values without halo, readable on the ground they stand on', async () => {
    const texts: { text: string; style: string }[] = [];
    spyOn(CanvasRenderingContext2D.prototype, 'fillText').and.callFake(
      function (this: CanvasRenderingContext2D, text: string) {
        texts.push({ text, style: this.fillStyle as string });
      },
    );
    const strokes = spyOn(CanvasRenderingContext2D.prototype, 'strokeText');
    for (const [dark, ground] of [
      [false, '#ead9c4'],
      [true, '#211914'],
    ] as const) {
      host.style.backgroundColor = ground;
      texts.length = 0;
      buffer = new FlowSeriesBuffer();
      await mount('live', dark);
      feed(buffer, 0, 2);
      await frames.run();

      const values = texts.filter((t) => /^\d+$/.test(t.text));
      expect(values.length).withContext(ground).toBeGreaterThan(4);
      for (const { text, style } of values) {
        expect(contrastRatio(style, ground))
          .withContext(`${text} in ${style} on ${ground}`)
          .toBeGreaterThanOrEqual(4.5);
      }
      renderer.destroy();
    }
    expect(strokes).not.toHaveBeenCalled();
  });

  it('exports a PNG data URL at its own size, scale and theme', async () => {
    await mount('static');
    feed(buffer, 0, 2);
    renderer.attach(buffer);
    await frames.run();

    const url = await renderer.exportImage({
      width: 150,
      height: 75,
      theme: 'dark',
      ink: '#123456',
      transparent: false,
      scale: 2,
    });

    expect(url.startsWith('data:image/png;base64,')).toBeTrue();
    const image = await decode(url);
    expect(image.width).toBe(300);
    expect(image.height).toBe(150);
    expect(pixel(image, 1, 1)).toEqual(rgb(CHART_PALETTE.dark.background));
    const clear = await decode(
      await renderer.exportImage({
        width: 150,
        height: 75,
        theme: 'light',
        transparent: true,
        scale: 1,
      }),
    );
    expect(pixel(clear, 1, 1)[3]).toBe(0);
    expect(document.querySelectorAll('.uplot').length).toBe(1);
  });

  it('draws ground, axes and their text in the ink given into the picture', async () => {
    await mount('static');
    feed(buffer, 0, 30);
    renderer.attach(buffer);
    await frames.run();

    const image = await decode(
      await renderer.exportImage({
        width: 300,
        height: 150,
        theme: 'light',
        ink: '#ff00ff',
        transparent: false,
        scale: 3,
      }),
    );

    expect(image.width).toBe(900);
    expect(image.height).toBe(450);
    expect(pixel(image, 1, 1)).toEqual(rgb(CHART_PALETTE.light.background));
    // uPlot draws its axes on the canvas, so the time labels at the bottom are in the picture.
    const strip = pixels(image, 0, image.height - 28 * 3, image.width, 28 * 3);
    expect(strip.filter(([r, g, b]) => r > 180 && g < 90 && b > 180).length)
      .withContext('ink pixels of the time axis')
      .toBeGreaterThan(50);
  });

  it('draws the lines of a picture in its theme, not in the app theme', async () => {
    await mount('static', false);
    renderer.setSeries(
      defs('live', 'weight').map((def) => ({
        ...def,
        colour: { light: '#ff0000', dark: '#00ff00' },
      })),
    );
    feed(buffer, 0, 30);
    renderer.attach(buffer);
    await frames.run();

    const image = await decode(
      await renderer.exportImage({
        width: 300,
        height: 150,
        theme: 'dark',
        transparent: true,
        scale: 1,
      }),
    );

    const all = pixels(image, 0, 0, image.width, image.height);
    const green = all.filter(([r, g, b]) => g > 200 && r < 60 && b < 60);
    const red = all.filter(([r, g, b]) => r > 200 && g < 60 && b < 60);
    expect(green.length).withContext('dark line pixels').toBeGreaterThan(50);
    expect(red.length).withContext('light line pixels').toBe(0);
  });

  it('draws the overlays of a picture in its theme, the graph keeps the app theme', async () => {
    const theme = new ThemeProbe();
    renderer = new UplotRenderer([theme], {
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
    });
    await renderer.mount(host, {
      width: 300,
      height: 150,
      dark: false,
      mode: 'static',
      axisSettings: new Settings(),
    });
    renderer.setSeries(defs('live', 'weight'));
    feed(buffer, 0, 2);
    renderer.attach(buffer);
    await frames.run();
    expect(theme.drawnDark).not.toContain(true);
    const before = theme.drawnDark.length;

    await renderer.exportImage({
      width: 150,
      height: 75,
      theme: 'dark',
      transparent: true,
      scale: 1,
    });

    const picture = theme.drawnDark.slice(before);
    expect(picture.length).toBeGreaterThan(0);
    expect(picture.every(Boolean)).toBeTrue();
    expect(theme.dark).toBeFalse();
  });

  /** Mounts three lines with their own axes; the reach is the rightmost x of the red weight line. */
  async function mountThreeAxes(
    mode: ChartMode,
  ): Promise<() => Promise<number>> {
    await mount(mode);
    renderer.setSeries(
      // Only the weight line is red; the other axes draw their ticks in their own colour.
      defs('live', 'weight', 'temperature', 'waterDispensed').map((def) => {
        const colour = def.id === 'weight' ? '#ff0000' : '#00ff00';
        return { ...def, colour: { light: colour, dark: colour } };
      }),
    );
    for (let k = 0; k < 300; k++) {
      buffer.append('weight', k / 10, 10);
      buffer.append('temperature', k / 10, 93);
      buffer.append('waterDispensed', k / 10, k);
    }
    renderer.attach(buffer);
    await frames.run();
    return async (): Promise<number> => {
      const image = await decode(
        await renderer.exportImage({
          width: 300,
          height: 150,
          theme: 'light',
          ink: '#0000ff',
          transparent: true,
          scale: 1,
        }),
      );
      let right = -1;
      pixels(image, 0, 0, image.width, image.height).forEach(([r, g, b], i) => {
        if (r > 200 && g < 60 && b < 60) {
          right = Math.max(right, i % image.width);
        }
      });
      return right;
    };
  }

  it('draws the value axes inside the plot, so the lines get the whole width', async () => {
    const rightmostLine = await mountThreeAxes('static');

    // Two axes of 36 px beside the plot used to stop the lines at 300 - 72.
    expect(await rightmostLine()).toBeGreaterThan(300 - 36);
    expect(plot().axes.map((axis) => axis.show)).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it('keeps the plot in place when an axis shows up after the first frame', async () => {
    await mount();
    renderer.setSeries(defs('live', 'weight', 'flowPerSecond', 'pressure'));
    await frames.run();
    const empty = { ...plot().bbox };

    buffer.append('weight', 0, 1);
    buffer.append('flowPerSecond', 0, 1);
    await frames.run();

    // A right axis that came in later used to stand where the hidden ones had kept room.
    expect(plot().axes[2].show).toBeTrue();
    expect(plot().bbox).toEqual(empty);
    const ratio = plot().ctx.canvas.width / 400;
    expect(plot().bbox.left).toBe(Math.round(14 * ratio));
    expect(plot().bbox.left + plot().bbox.width).toBe(Math.round(386 * ratio));
  });

  it('exports a live graph without temperature and water axes, as it shows them', async () => {
    const rightmostLine = await mountThreeAxes('live');

    expect(await rightmostLine()).toBeGreaterThan(300 - 36);
  });

  it('keeps temperature and water bare in a picture with one ink colour', async () => {
    await mountThreeAxes('static');

    const image = await decode(
      await renderer.exportImage({
        width: 300,
        height: 150,
        theme: 'light',
        ink: '#0000ff',
        transparent: true,
        scale: 1,
      }),
    );

    // Above the time axis only right value columns could be blue; four
    // columns in one ink could not be told apart.
    const ink = pixels(image, 150, 0, 150, 150 - 28).filter(
      ([r, g, b, a]) => a > 0 && b > 180 && r < 90 && g < 90,
    );
    expect(ink.length).toBe(0);
  });

  it('refuses to export without series', async () => {
    renderer = new UplotRenderer([], {
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
    });
    await expectAsync(
      renderer.exportImage({
        width: 1,
        height: 1,
        theme: 'light',
        transparent: true,
        scale: 1,
      }),
    ).toBeRejectedWithError(/nothing to export/);
  });

  it('stops scheduling frames and removes the chart on destroy', async () => {
    await mount();
    feed(buffer, 0, 2);
    await frames.run();

    renderer.destroy();
    expect(frames.pending).toBe(0);
    expect(host.querySelector('.uplot')).toBeNull();
    renderer.setCursor(1);
    feed(buffer, 2, 3);
    expect(frames.pending).toBe(0);
  });

  it('does not wake up for a growing buffer outside live mode', async () => {
    await mount('detail');
    feed(buffer, 0, 1);
    await frames.run();
    await frames.run();
    expect(frames.pending).toBe(0);

    feed(buffer, 1, 2);
    expect(frames.pending).toBe(0);
  });

  it('does not build after a destroy that came before the library', async () => {
    renderer = new UplotRenderer([], {
      requestFrame: frames.request,
      cancelFrame: frames.cancel,
    });
    const mounting = renderer.mount(host, {
      width: 100,
      height: 100,
      dark: false,
      mode: 'static',
      axisSettings: new Settings(),
    });
    renderer.destroy();
    await mounting;
    expect(frames.pending).toBe(0);
  });

  it('loads uPlot once', async () => {
    expect(await loadUplot()).toBe(await loadUplot());
  });

  describe('pure helpers', () => {
    it('formats seconds as m:ss', () => {
      expect(formatSeconds(0)).toBe('0:00');
      expect(formatSeconds(9.6)).toBe('0:10');
      expect(formatSeconds(125)).toBe('2:05');
      expect(formatSeconds(-1)).toBe('0:00');
    });

    it('computes the visible time range', () => {
      expect(viewportRange({ mode: 'fitAll' }, 30)).toEqual([0, 30]);
      expect(viewportRange({ mode: 'fitAll' }, 0)).toEqual([0, 1]);
      expect(viewportRange({ mode: 'range', from: 2, to: 5 }, 30)).toEqual([
        2, 5,
      ]);
      expect(viewportRange({ mode: 'range', from: 2, to: 2 }, 30)).toEqual([
        2, 2.001,
      ]);
      expect(viewportRange({ mode: 'grow', startSec: 20 }, 30)).toEqual([
        0, 37.5,
      ]);
    });

    it('starts the live window with its length and then grows it with the brew', () => {
      expect(liveTimeRange(0, 20)).toEqual([0, 20]);
      expect(liveTimeRange(16, 20)).toEqual([0, 20]);
      expect(liveTimeRange(30, 20)).toEqual([0, 37.5]);
      expect(liveTimeRange(360, 20)).toEqual([0, 450]);
      // A long start window keeps still until the brew comes near its end.
      expect(liveTimeRange(200, 300)).toEqual([0, 300]);
      expect(liveTimeRange(-3, 20)).toEqual([0, 20]);
      expect(liveTimeRange(Number.NaN, 20)).toEqual([0, 20]);
      expect(liveTimeRange(5, 0)).toEqual([0, 20]);
      expect(liveTimeRange(5, Number.NaN)).toEqual([0, 20]);
    });

    it('draws references first and orders the axes by the live series', () => {
      const layout = layoutSeries([
        ...defs('live', 'pressure', 'weight'),
        ...defs('reference', 'weight', 'temperature'),
      ]);
      expect(layout.drawn.map((d) => `${d.kind}:${d.id}`)).toEqual([
        'reference:weight',
        'reference:temperature',
        'live:pressure',
        'live:weight',
      ]);
      expect(layout.axes).toEqual(['pressure', 'weight', 'temperature']);
    });

    it('keeps temperature and water axes bare only while live', () => {
      expect(axisShown('temperature', true)).toBeFalse();
      expect(axisShown('water', true)).toBeFalse();
      expect(axisShown('weight', true)).toBeTrue();
      expect(axisShown('temperature', false)).toBeTrue();
    });
  });
});

function seriesStroke(u: uPlot, index: number): unknown {
  const stroke = u.series[index].stroke;
  return typeof stroke === 'function' ? stroke(u, index) : stroke;
}

function decode(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

function pixel(image: HTMLImageElement, x: number, y: number): number[] {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  return Array.from(ctx.getImageData(x, y, 1, 1).data);
}

function pixels(
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): number[][] {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(x, y, width, height).data;
  const result: number[][] = [];
  for (let i = 0; i < data.length; i += 4) {
    result.push([data[i], data[i + 1], data[i + 2], data[i + 3]]);
  }
  return result;
}

function rgb(hex: string): number[] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(255);
}
