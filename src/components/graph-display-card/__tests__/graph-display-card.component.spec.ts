import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideTranslateService } from '@ngx-translate/core';

import { BrewFlow } from '../../../classes/brew/brewFlow';
import { MeticulousDevice } from '../../../classes/preparationDevice/meticulous/meticulousDevice';
import { Settings } from '../../../classes/settings/settings';
import { GraphHelperService } from '../../../services/graphHelper/graph-helper.service';
import { ThemeService } from '../../../services/theme/theme.service';
import { UILog } from '../../../services/uiLog';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UplotRenderer } from '../../brews/graph/uplot-renderer';
import {
  GraphDisplayCardComponent,
  MeticulousEntry,
} from '../graph-display-card.component';

/** A short brew: weight and pressure, one sample per second. */
function flow(seconds = 5): BrewFlow {
  const brew = new BrewFlow();
  for (let s = 0; s < seconds; s++) {
    const timestamp = `10:00:0${s}.000`;
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
    brew.pressureFlow.push({
      timestamp,
      brew_time: String(s),
      actual_pressure: 9,
      old_pressure: 0,
    });
  }
  return brew;
}

/** Shot data as the Meticulous history detail holds it. */
function shotData(): NonNullable<MeticulousEntry['data']> {
  return [0, 1000, 2000].map((time) => ({
    time,
    shot: { weight: time / 100, pressure: 8, gravimetric_flow: 2 },
  })) as unknown as NonNullable<MeticulousEntry['data']>;
}

@Component({
  template: `<div [style.width.px]="width()" [style.margin-top.px]="offset()">
    <graph-display-card
      [flowProfilePath]="path()"
      [flowProfileData]="data()"
      [meticulousHistoryData]="meticulous()"
      [meticulousDevice]="device()"
      [gaggiuinoHistoryData]="gaggiuino()"
      [gaggimateHistoryData]="gaggimate()"
      [chartHeight]="height()"
    />
  </div>`,
  imports: [GraphDisplayCardComponent],
})
class HostComponent {
  public readonly width = signal(320);
  public readonly offset = signal(0);
  public readonly path = signal<string | undefined>(undefined);
  public readonly data = signal<BrewFlow | undefined>(undefined);
  public readonly meticulous = signal<MeticulousEntry | undefined>(undefined);
  public readonly device = signal<MeticulousDevice | undefined>(undefined);
  public readonly gaggiuino = signal<BrewFlow | undefined>(undefined);
  public readonly gaggimate = signal<BrewFlow | undefined>(undefined);
  public readonly height = signal<number | undefined>(undefined);
}

describe('GraphDisplayCardComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let dark: ReturnType<typeof signal<boolean>>;
  let readFlowProfile: jasmine.Spy;
  let logError: jasmine.Spy;

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function chart(): HTMLElement {
    return element().querySelector('graph-display-card [role="img"]');
  }

  function drawn(): HTMLCanvasElement | null {
    return chart().querySelector('.uplot canvas');
  }

  /** Lets observers, effects, file reads, the chart library and a frame run. */
  async function settle(rounds = 6): Promise<void> {
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

  function create(setup: (host: HostComponent) => void): void {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    setup(host);
    document.body.appendChild(element());
  }

  beforeEach(() => {
    dark = signal(false);
    readFlowProfile = jasmine
      .createSpy('readFlowProfile')
      .and.callFake(() => Promise.resolve(flow()));
    logError = jasmine.createSpy('error');
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideTranslateService(),
        { provide: GraphHelperService, useValue: { readFlowProfile } },
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

  it('draws the flow file of a brew as a named picture', async () => {
    create((h) => h.path.set('brews/flow.json'));
    await until(() => !!drawn());

    expect(readFlowProfile).toHaveBeenCalledOnceWith('brews/flow.json');
    expect(drawn()).not.toBeNull();
    expect(chart().getAttribute('aria-label')).toBe('A11Y.FLOW_PROFILE_GRAPH');
    expect(chart().querySelector('.uplot').getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('draws given flow data as wide as its container and 150 px high', async () => {
    create((h) => h.data.set(flow()));
    await until(() => !!drawn());

    const root = chart().querySelector<HTMLElement>('.uplot');
    expect(chart().offsetHeight).toBe(150);
    expect(root.getBoundingClientRect().width).toBe(320);
    expect(root.getBoundingClientRect().height).toBe(150);
  });

  it('takes the height it is given and follows a new width', async () => {
    create((h) => {
      h.data.set(flow());
      h.height.set(200);
    });
    await until(() => !!drawn());
    const root = chart().querySelector<HTMLElement>('.uplot');
    expect(root.getBoundingClientRect().height).toBe(200);

    host.width.set(240);
    await until(() => root.getBoundingClientRect().width === 240);
    expect(root.getBoundingClientRect().width).toBe(240);
  });

  it('draws the shots of Gaggiuino and Gaggimate', async () => {
    create((h) => h.gaggiuino.set(flow()));
    await until(() => !!drawn());
    expect(drawn()).not.toBeNull();

    element().remove();
    fixture.destroy();
    create((h) => h.gaggimate.set(flow()));
    await until(() => !!drawn());
    expect(drawn()).not.toBeNull();
  });

  it('fetches the data of a Meticulous shot once and keeps it on the entry', async () => {
    const getHistoryEntryDetails = jasmine
      .createSpy('getHistoryEntryDetails')
      .and.resolveTo({ data: shotData() });
    const entry = { id: 'shot-1', data: null } as MeticulousEntry;
    create((h) => {
      h.meticulous.set(entry);
      h.device.set({ getHistoryEntryDetails } as unknown as MeticulousDevice);
    });
    await until(() => !!drawn());

    expect(getHistoryEntryDetails).toHaveBeenCalledOnceWith('shot-1');
    expect(entry.data).toEqual(shotData());
    expect(drawn()).not.toBeNull();

    host.meticulous.set({ id: 'shot-2', data: shotData() } as MeticulousEntry);
    await settle();
    expect(getHistoryEntryDetails).toHaveBeenCalledTimes(1);
  });

  it('draws nothing for a Meticulous shot whose data cannot be fetched', async () => {
    const getHistoryEntryDetails = jasmine
      .createSpy('getHistoryEntryDetails')
      .and.rejectWith(new Error('offline'));
    create((h) => {
      h.meticulous.set({ id: 'shot-1', data: null } as MeticulousEntry);
      h.device.set({ getHistoryEntryDetails } as unknown as MeticulousDevice);
    });
    await settle();

    expect(getHistoryEntryDetails).toHaveBeenCalled();
    expect(drawn()).toBeNull();
  });

  it('neither reads nor draws without a width', async () => {
    const mount = spyOn(UplotRenderer.prototype, 'mount').and.callThrough();
    create((h) => {
      h.width.set(0);
      h.path.set('brews/flow.json');
    });
    await settle();

    expect(readFlowProfile).not.toHaveBeenCalled();
    expect(mount).not.toHaveBeenCalled();

    host.width.set(300);
    await until(() => !!drawn());
    expect(readFlowProfile).toHaveBeenCalledTimes(1);
    expect(drawn()).not.toBeNull();
  });

  it('waits until it is scrolled or swiped into view', async () => {
    create((h) => {
      h.offset.set(window.innerHeight + 2000);
      h.path.set('brews/flow.json');
    });
    await settle();
    expect(readFlowProfile).not.toHaveBeenCalled();

    host.offset.set(0);
    await until(() => !!drawn());
    expect(readFlowProfile).toHaveBeenCalledTimes(1);
    expect(drawn()).not.toBeNull();
  });

  it('follows the theme', async () => {
    const setDark = spyOn(UplotRenderer.prototype, 'setDark').and.callThrough();
    create((h) => h.data.set(flow()));
    await until(() => !!drawn());

    dark.set(true);
    await settle();

    expect(setDark).toHaveBeenCalledWith(true);
  });

  it('shows no graph and does not fail for a broken or empty profile', async () => {
    readFlowProfile.and.rejectWith(new Error('not found'));
    create((h) => h.path.set('brews/missing.json'));
    await settle();

    expect(drawn()).toBeNull();
    expect(logError).toHaveBeenCalled();

    element().remove();
    fixture.destroy();
    create((h) => h.data.set({ weight: 'nonsense' } as unknown as BrewFlow));
    await settle();
    expect(drawn()).toBeNull();
  });

  it('removes a drawn graph when the profile turns out empty', async () => {
    create((h) => h.data.set(flow()));
    await until(() => !!drawn());

    host.data.set(new BrewFlow());
    await until(() => !drawn());
    expect(drawn()).toBeNull();
  });

  it('stays empty when the chart library cannot load, and tries again', async () => {
    const mount = spyOn(UplotRenderer.prototype, 'mount').and.returnValues(
      Promise.reject(new Error('chunk failed')),
      Promise.resolve(),
    );
    create((h) => h.data.set(flow()));
    await settle();
    expect(logError).toHaveBeenCalled();

    host.data.set(flow(4));
    await settle();
    expect(mount).toHaveBeenCalledTimes(2);
  });

  it('releases the chart when it goes away', async () => {
    const destroy = spyOn(UplotRenderer.prototype, 'destroy').and.callThrough();
    create((h) => h.data.set(flow()));
    await until(() => !!drawn());

    fixture.destroy();

    expect(destroy).toHaveBeenCalled();
  });

  it('drops a read that a newer profile overtook', async () => {
    let finishFirst: (value: BrewFlow) => void;
    readFlowProfile.and.returnValues(
      new Promise<BrewFlow>((resolve) => (finishFirst = resolve)),
      Promise.resolve(flow()),
    );
    const setSeries = spyOn(
      UplotRenderer.prototype,
      'setSeries',
    ).and.callThrough();
    create((h) => h.path.set('brews/old.json'));
    await settle();
    host.path.set('brews/new.json');
    await until(() => !!drawn());
    const calls = setSeries.calls.count();

    finishFirst(flow(3));
    await settle();

    expect(setSeries.calls.count()).toBe(calls);
  });
});
