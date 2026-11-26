import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { provideTranslateService, TranslateService } from '@ngx-translate/core';

import { Brew } from 'src/classes/brew/brew';
import { BrewFlow } from '../../../../classes/brew/brewFlow';
import { MeticulousDevice } from '../../../../classes/preparationDevice/meticulous/meticulousDevice';
import { Settings } from '../../../../classes/settings/settings';
import { CutMarkersPlugin } from '../../../../components/brews/graph/overlays/cut-markers';
import type { SeriesDef } from '../../../../components/brews/graph/series-def';
import { UplotRenderer } from '../../../../components/brews/graph/uplot-renderer';
import { PREPARATION_STYLE_TYPE } from '../../../../enums/preparations/preparationStyleTypes';
import { ThemeService } from '../../../../services/theme/theme.service';
import { UILog } from '../../../../services/uiLog';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { BrewPopoverCutComponent } from '../brew-popover-cut.component';

/** A Meticulous shot of 30 s whose times have to be recovered for the cut. */
function legacyShot(): BrewFlow {
  const flow = MeticulousDevice.returnBrewFlowForShotData(
    [100, 1350, 30125].map((time, index) => ({
      time,
      shot: { weight: index * 12, pressure: 9, gravimetric_flow: 2 },
    })),
  );
  for (const samples of [flow.weight, flow.pressureFlow, flow.realtimeFlow]) {
    samples.forEach((sample) => {
      sample.brew_time = '';
    });
  }
  return flow;
}

/** A shot with an imported metric next to the weight. */
function shotWithMetric(): BrewFlow {
  const flow = legacyShot();
  flow.customMetrics.counter = flow.weight.map((sample, i) => ({
    value: i * 5,
    timestamp: sample.timestamp,
    brew_time: sample.brew_time,
  }));
  flow.customAxes = [
    {
      key: 'counter',
      name: 'Counter',
      unit: 'ml',
      colorLight: '#123456',
      colorDark: '#abcdef',
    },
  ];
  return flow;
}

function brew(): Brew {
  return {
    getPreparation: () => ({ style_type: PREPARATION_STYLE_TYPE.ESPRESSO }),
  } as unknown as Brew;
}

function rangeInput(lower: number, upper: number): Event {
  return { detail: { value: { lower, upper } } } as unknown as Event;
}

describe('BrewPopoverCutComponent', () => {
  let fixture: ComponentFixture<BrewPopoverCutComponent>;
  let component: BrewPopoverCutComponent;
  let dark: ReturnType<typeof signal<boolean>>;
  let dismiss: jasmine.Spy;
  let logError: jasmine.Spy;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function chart(): HTMLElement {
    return element().querySelector('.chart');
  }

  function drawn(): HTMLElement | null {
    return chart().querySelector('.uplot');
  }

  async function frame(): Promise<void> {
    fixture.detectChanges();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  /** Settles until `done` holds; the first load of uPlot may take a moment. */
  async function until(done: () => boolean): Promise<void> {
    for (let i = 0; i < 40 && !done(); i++) {
      await frame();
    }
  }

  function create(flow: BrewFlow): void {
    fixture = TestBed.createComponent(BrewPopoverCutComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('brew', brew());
    fixture.componentRef.setInput('flowProfile', flow);
    element().style.display = 'block';
    element().style.width = '320px';
    document.body.appendChild(element());
    fixture.detectChanges();
  }

  beforeEach(() => {
    dark = signal(false);
    dismiss = jasmine.createSpy('dismiss').and.resolveTo(true);
    logError = jasmine.createSpy('error');
    TestBed.configureTestingModule({
      imports: [BrewPopoverCutComponent],
      providers: [
        provideTranslateService(),
        { provide: ModalController, useValue: { dismiss } },
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

  it('offers the whole profile, previews the weight and saves the cut', () => {
    create(legacyShot());

    expect(component.maxTime()).toBe(30.025);
    expect(component.cutRange()).toEqual({ lower: 0, upper: 30.025 });
    expect(component.newFinalWeight()).toBe(24);
    expect(component.saveDisabled()).toBeTrue();
    component.onRangeInput(rangeInput(1.25, 2));
    expect(component.newFinalWeight()).toBe(12);
    expect(component.duration()).toBe(0.75);
    expect(component.rightCut()).toBeCloseTo(28.025, 6);
    expect(component.saveDisabled()).toBeFalse();

    component.save();

    const [cut, role, id] = dismiss.calls.mostRecent().args;
    expect(role).toBe('save');
    expect(id).toBe(BrewPopoverCutComponent.COMPONENT_ID);
    const saved = cut as { flowProfile: BrewFlow } & Record<string, unknown>;
    expect(saved.flowProfile.weight.length).toBe(1);
    expect(saved.finalWeight).toBe(12);
    expect(saved.brew_time).toBe(1);
    expect(saved.brew_time_milliseconds).toBe(750);
  });

  it('shows the new weight and duration as text', async () => {
    create(legacyShot());
    component.onRangeInput(rangeInput(1.25, 2));
    await until(() => component.loaded());
    await frame();

    const text = element().textContent;
    expect(text).toContain('12.0 g');
    expect(text).toContain('0.75s');
    expect(text).toContain('1.250s');
    expect(text).toContain('28.025s');
  });

  it('closes without a cut', () => {
    create(legacyShot());

    component.dismiss();

    expect(dismiss).toHaveBeenCalledOnceWith(
      undefined,
      'cancel',
      BrewPopoverCutComponent.COMPONENT_ID,
    );
  });

  it('draws the graph with its imported metrics as a named picture', async () => {
    const setSeries = spyOn(
      UplotRenderer.prototype,
      'setSeries',
    ).and.callThrough();
    create(shotWithMetric());
    await until(() => !!drawn()?.querySelector('canvas'));

    expect(drawn()).not.toBeNull();
    expect(chart().getAttribute('aria-label')).toBe(
      'A11Y.GRAPH_VALUES_AS_TEXT',
    );
    expect(element().querySelector('#cutChart')).toBeNull();
    const defs = setSeries.calls.mostRecent().args[0] as SeriesDef[];
    const metric = defs.find((def) => def.id === 'custom:counter');
    expect(metric?.colour).toEqual({ light: '#123456', dark: '#abcdef' });
  });

  it('puts the cut markers where the knobs are, without drawing the graph again', async () => {
    const mount = spyOn(UplotRenderer.prototype, 'mount').and.callThrough();
    const setViewport = spyOn(
      UplotRenderer.prototype,
      'setViewport',
    ).and.callThrough();
    const setSeries = spyOn(
      UplotRenderer.prototype,
      'setSeries',
    ).and.callThrough();
    const apply = spyOn(CutMarkersPlugin.prototype, 'apply').and.callThrough();
    const cuts = () => apply.calls.all().map((call) => call.args[0].cut);
    create(legacyShot());
    await until(() => cuts().length > 0);
    expect(cuts().at(-1)).toEqual([0, 30.025]);
    expect(setViewport).toHaveBeenCalledOnceWith({
      mode: 'range',
      from: 0,
      to: 30.025,
    });
    const root = drawn();
    const canvas = root.querySelector('canvas');

    component.onRangeInput(rangeInput(1.25, 2));
    await frame();
    component.onRangeInput(rangeInput(2.5, 20));
    await frame();

    expect(cuts().at(-1)).toEqual([2.5, 20]);
    expect(drawn()).toBe(root);
    expect(drawn().querySelector('canvas')).toBe(canvas);
    expect(mount).toHaveBeenCalledTimes(1);
    expect(setSeries).toHaveBeenCalledTimes(1);
  });

  it('draws at the width the dialog has once uPlot is loaded', async () => {
    let release: () => void = () => undefined;
    const loading = new Promise<void>((resolve) => (release = resolve));
    const started = spyOn(UplotRenderer.prototype, 'mount');
    started.and.callFake(async function (
      this: UplotRenderer,
      ...args: Parameters<UplotRenderer['mount']>
    ): Promise<void> {
      await loading;
      started.and.callThrough();
      await this.mount(...args);
    });
    create(legacyShot());
    await until(() => started.calls.count() > 0);

    element().style.width = '400px';
    await frame();
    await frame();
    release();
    await until(() => !!drawn()?.querySelector('canvas'));
    await frame();

    // Ionic's padding and card margins settle late; compare with the box itself.
    const wrap = drawn().querySelector<HTMLElement>('.u-wrap');
    const width = Math.floor(chart().getBoundingClientRect().width);
    expect(wrap.style.width).toBe(`${width}px`);
  });

  it('ignores a range event without two knobs', () => {
    create(legacyShot());

    component.onRangeInput({ detail: { value: 3 } } as unknown as Event);

    expect(component.cutRange()).toEqual({ lower: 0, upper: 30.025 });
  });

  it('follows the theme', async () => {
    const setDark = spyOn(UplotRenderer.prototype, 'setDark').and.callThrough();
    create(legacyShot());
    await until(() => !!drawn()?.querySelector('canvas'));

    dark.set(true);
    await frame();

    expect(setDark).toHaveBeenCalledWith(true);
  });

  it('still cuts when the graph cannot be drawn', async () => {
    spyOn(UplotRenderer.prototype, 'mount').and.rejectWith(
      new Error('chunk failed'),
    );
    create(legacyShot());
    await until(() => logError.calls.count() > 0);

    expect(logError).toHaveBeenCalledWith(
      'Cut graph could not be drawn',
      jasmine.any(Error),
    );
    component.onRangeInput(rangeInput(1.25, 2));
    component.save();
    expect(dismiss).toHaveBeenCalled();
  });

  it('says the new duration and weight after a knob value', () => {
    create(legacyShot());
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      A11Y: { CUT_RESULT: 'neue Dauer {{duration}}, neues Gewicht {{weight}}' },
    });
    translate.use('de');

    expect(component.cutSummary({ lower: 1.25, upper: 2 })).toBe(
      'neue Dauer 0,75 s, neues Gewicht 12 g',
    );
  });
});
