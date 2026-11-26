import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideTranslateService } from '@ngx-translate/core';

import { BrewFlow } from '../../../../../classes/brew/brewFlow';
import { Settings } from '../../../../../classes/settings/settings';
import { ThemeService } from '../../../../../services/theme/theme.service';
import { UILog } from '../../../../../services/uiLog';
import { UISettingsStorage } from '../../../../../services/uiSettingsStorage';
import { UplotRenderer } from '../../uplot-renderer';
import {
  BrewGraphViewComponent,
  PAGE_STEP_SEC,
} from '../brew-graph-view.component';

/** A brew of `seconds` seconds: weight 2 g/s and a pH metric of its own. */
function flow(seconds = 20, withMetric = true): BrewFlow {
  const brew = new BrewFlow();
  for (let s = 0; s <= seconds; s++) {
    const timestamp = `10:00:${String(s).padStart(2, '0')}.000`;
    brew.weight.push({
      timestamp,
      brew_time: String(s),
      actual_weight: s * 2,
      old_weight: 0,
      actual_smoothed_weight: 0,
      old_smoothed_weight: 0,
      not_mutated_weight: 0,
      calculated_real_flow: 0,
    });
  }
  if (withMetric) {
    brew.customMetrics = {
      ph: [
        { timestamp: '10:00:00.000', brew_time: '0', value: 6.5 },
        { timestamp: '10:00:10.000', brew_time: '10', value: 6.1 },
      ],
    };
    brew.customAxes = [
      {
        key: 'ph',
        name: 'pH',
        unit: 'pH',
        colorLight: '#123456',
        colorDark: '#abcdef',
      },
    ];
  }
  return brew;
}

@Component({
  template: `<div [style.width.px]="320" [style.height.px]="480">
    <app-brew-graph-view [flow]="flow()" [reference]="reference()">
      <button type="button" class="projected">Close</button>
    </app-brew-graph-view>
  </div>`,
  imports: [BrewGraphViewComponent],
})
class HostComponent {
  public readonly flow = signal<BrewFlow | null>(flow());
  public readonly reference = signal<BrewFlow | null>(null);
}

describe('BrewGraphViewComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let dark: ReturnType<typeof signal<boolean>>;
  let logError: jasmine.Spy;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function chart(): HTMLElement {
    return element().querySelector('app-brew-graph-view [role="img"]');
  }

  function drawn(): HTMLCanvasElement | null {
    return chart().querySelector('.uplot canvas');
  }

  function chips(): HTMLElement[] {
    return [...element().querySelectorAll<HTMLElement>('ion-chip')];
  }

  function chip(label: string): HTMLElement {
    return chips().find((each) => each.textContent.trim() === label);
  }

  function range(): HTMLElement {
    return element().querySelector('ion-range');
  }

  function view(): BrewGraphViewComponent {
    return fixture.debugElement.children[0].children[0]
      .componentInstance as BrewGraphViewComponent;
  }

  /** Lets observers, effects, the chart library and a frame run. */
  async function settle(rounds = 4): Promise<void> {
    for (let i = 0; i < rounds; i++) {
      fixture.detectChanges();
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => setTimeout(resolve));
    }
    fixture.detectChanges();
  }

  /** Settles until `done` holds; the first load of uPlot may take a moment. */
  async function until(done: () => boolean): Promise<void> {
    for (let i = 0; i < 20 && !done(); i++) {
      await settle(2);
    }
  }

  function create(setup?: (host: HostComponent) => void): void {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    setup?.(host);
    document.body.appendChild(element());
  }

  beforeEach(() => {
    dark = signal(false);
    logError = jasmine.createSpy('error');
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideTranslateService(),
        { provide: ThemeService, useValue: { dark } },
        { provide: UILog, useValue: { error: logError } },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => new Settings() },
        },
      ],
    });
  });

  afterEach(() => {
    element().remove();
    fixture.destroy();
  });

  it('draws the brew in a named picture with the content given next to the chips', async () => {
    create();
    await until(() => !!drawn());

    expect(drawn()).not.toBeNull();
    expect(chart().getAttribute('aria-label')).toContain(
      'A11Y.FLOW_PROFILE_GRAPH. BREW_FLOW_WEIGHT (g):',
    );
    expect(chart().querySelector('.uplot').getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(element().querySelector('.chips .projected')).not.toBeNull();
  });

  it('draws the reference underneath the brew', async () => {
    const setReferences = spyOn(
      UplotRenderer.prototype,
      'setReferences',
    ).and.callThrough();
    const setSeries = spyOn(
      UplotRenderer.prototype,
      'setSeries',
    ).and.callThrough();
    create((h) => h.reference.set(flow(30, false)));
    await until(() => !!drawn());

    expect(setReferences).toHaveBeenCalledWith(jasmine.anything());
    const defs = setSeries.calls.mostRecent().args[0];
    expect(defs.map((d) => `${d.kind}:${d.id}`)).toEqual([
      'live:weight',
      'live:custom:ph',
      'reference:weight',
    ]);
    // The slider reaches the end of the longer reference too.
    expect((range() as HTMLElement & { max: number }).max).toBe(30);
  });

  it('offers a chip per series with data, its own metrics included, in the series colour', async () => {
    create();
    await settle();

    expect(chips().map((each) => each.textContent.trim())).toEqual([
      'BREW_FLOW_WEIGHT',
      'pH',
    ]);
    const ph = chip('pH');
    expect(ph.getAttribute('style')).toContain('--chip-color: #123456');
    expect(ph.classList).toContain('custom-trace-chip');
    expect(ph.classList).toContain('trace-active');
    expect(ph.getAttribute('role')).toBe('button');
    expect(ph.getAttribute('aria-pressed')).toBe('true');
  });

  it('hides a series and its reference twin with its chip, and shows them again', async () => {
    const setVisible = spyOn(
      UplotRenderer.prototype,
      'setVisible',
    ).and.callThrough();
    create((h) => h.reference.set(flow(30, false)));
    await until(() => !!drawn());
    setVisible.calls.reset();

    chip('BREW_FLOW_WEIGHT').click();
    await settle();

    expect(setVisible).toHaveBeenCalledWith('weight', false);
    expect(chip('BREW_FLOW_WEIGHT').getAttribute('aria-pressed')).toBe('false');
    expect(chip('BREW_FLOW_WEIGHT').classList).not.toContain('trace-active');
    expect(chart().getAttribute('aria-label')).not.toContain(
      'BREW_FLOW_WEIGHT',
    );

    chip('BREW_FLOW_WEIGHT').click();
    await settle();
    expect(setVisible).toHaveBeenCalledWith('weight', true);
  });

  it('starts a metric hidden when its axis asks for it', async () => {
    const brew = flow();
    brew.customAxes[0].hiddenDefault = true;
    create((h) => h.flow.set(brew));
    await settle();

    expect(chip('pH').getAttribute('aria-pressed')).toBe('false');
  });

  it('moves the cursor with the slider and says the values at it', async () => {
    const setCursor = spyOn(
      UplotRenderer.prototype,
      'setCursor',
    ).and.callThrough();
    create();
    await until(() => !!drawn());

    const slider = range() as HTMLElement & { max: number; step: number };
    expect(slider.max).toBe(20);
    expect(slider.step).toBe(0.1);
    slider.dispatchEvent(
      new CustomEvent('ionInput', { detail: { value: 10 } }),
    );
    await settle();

    expect(setCursor).toHaveBeenCalledWith(10);
    expect(element().querySelector('ion-badge').textContent.trim()).toBe(
      '10.0s',
    );
    const words = (
      view() as unknown as { valueText: () => (t: number) => string }
    ).valueText();
    expect(words(10)).toBe('10.0 s, BREW_FLOW_WEIGHT: 20.0 g, pH: 6.1 pH');

    chip('pH').click();
    await settle();
    expect(
      (
        view() as unknown as { valueText: () => (t: number) => string }
      ).valueText()(10),
    ).toBe('10.0 s, BREW_FLOW_WEIGHT: 20.0 g');
  });

  it('moves the slider by pages with PageUp and PageDown, within the brew', async () => {
    const setCursor = spyOn(
      UplotRenderer.prototype,
      'setCursor',
    ).and.callThrough();
    create();
    await until(() => !!drawn());

    const press = (key: string): KeyboardEvent => {
      const event = new KeyboardEvent('keydown', { key, cancelable: true });
      range().dispatchEvent(event);
      return event;
    };
    const event = press('PageUp');
    await settle();
    expect(event.defaultPrevented).toBe(true);
    expect(setCursor).toHaveBeenCalledWith(PAGE_STEP_SEC);

    for (let i = 0; i < 6; i++) {
      press('PageUp');
    }
    await settle();
    expect(setCursor).toHaveBeenCalledWith(20);

    for (let i = 0; i < 6; i++) {
      press('PageDown');
    }
    await settle();
    expect(setCursor.calls.mostRecent().args[0]).toBe(0);
  });

  it('follows the theme with the graph and the chip colours', async () => {
    const setDark = spyOn(UplotRenderer.prototype, 'setDark').and.callThrough();
    create();
    await until(() => !!drawn());

    dark.set(true);
    await settle();

    expect(setDark).toHaveBeenCalledWith(true);
    expect(chip('pH').getAttribute('style')).toContain('--chip-color: #abcdef');
  });

  it('follows the size of its box', async () => {
    const resize = spyOn(UplotRenderer.prototype, 'resize').and.callThrough();
    create();
    await until(() => !!drawn());

    (element().firstElementChild as HTMLElement).style.width = '280px';
    await until(() => resize.calls.mostRecent()?.args[0] === 280);

    expect(resize.calls.mostRecent().args[0]).toBe(280);
  });

  it('shows a hint instead of a graph for a broken or missing profile', async () => {
    const mount = spyOn(UplotRenderer.prototype, 'mount').and.callThrough();
    create((h) => h.flow.set({ weight: 'nonsense' } as unknown as BrewFlow));
    await settle();

    expect(mount).not.toHaveBeenCalled();
    expect(chart().hidden).toBe(true);
    expect(element().querySelector('.hint').textContent.trim()).toBe(
      'GRAPH_CANNOT_BE_SHOWN',
    );
    expect(range()).toBeNull();
    expect(element().querySelector('.chips .projected')).not.toBeNull();

    host.flow.set(null);
    await settle();
    expect(element().querySelector('.hint')).not.toBeNull();
  });

  it('logs and stays empty when the chart library cannot load', async () => {
    spyOn(UplotRenderer.prototype, 'mount').and.rejectWith(
      new Error('chunk failed'),
    );
    create();
    await settle();

    expect(logError).toHaveBeenCalled();
    expect(drawn()).toBeNull();
  });

  it('releases the chart when it goes away', async () => {
    const destroy = spyOn(UplotRenderer.prototype, 'destroy').and.callThrough();
    const disconnect = spyOn(
      ResizeObserver.prototype,
      'disconnect',
    ).and.callThrough();
    create();
    await until(() => !!drawn());

    fixture.destroy();

    expect(destroy).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
  });

  it('moves the slider in its steps when the graph is dragged', async () => {
    create();
    await until(() => !!drawn());

    const over = chart().querySelector<HTMLElement>('.u-over');
    const rect = over.getBoundingClientRect();
    over.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 1,
        clientX: rect.left + rect.width * 0.333,
        clientY: rect.top + 10,
      }),
    );
    over.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }));
    await settle();

    const value = (view() as unknown as { cursor: () => number }).cursor();
    expect(value).toBeGreaterThan(5);
    expect(value).toBeLessThan(8);
    expect(Math.round(value * 10)).toBe(value * 10);
  });
});
