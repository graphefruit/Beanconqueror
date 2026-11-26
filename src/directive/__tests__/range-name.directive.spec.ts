import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  flush,
  flushMicrotasks,
  TestBed,
  tick,
} from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LIVE_REGION, LiveRegion } from '../../services/a11y/live-region';
import {
  DRAG_ANNOUNCE_INTERVAL_MS,
  DRAG_SETTLE_MS,
  movedKnob,
  RangeNameDirective,
  RangeValue,
  rangeValueText,
  steppedRangeValue,
} from '../range-name.directive';

/**
 * Ionic's components do not load in unit tests, so the directive runs on a
 * stand-in element with the knobs ion-range renders into its shadow root.
 * e2e/a11y-forms.spec.ts covers the real one.
 */
@Component({
  imports: [RangeNameDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<test-range
    [rangeLabel]="label()"
    [rangeUnit]="unit()"
    [rangeOfMax]="ofMax()"
    [rangeKeyStep]="keyStep()"
    [rangeSummary]="summary()"
  />`,
})
class HostComponent {
  public readonly label = signal('Bildqualität');
  public readonly unit = signal('%');
  public readonly ofMax = signal(false);
  public readonly keyStep = signal<number | undefined>(undefined);
  public readonly summary = signal<
    ((value: { lower: number; upper: number }) => string) | undefined
  >(undefined);
}

function knob(value: number, extraPart = ''): string {
  return `<div role="slider" part="knob-handle ${extraPart}" aria-labelledby="range-label" aria-valuenow="${value}"></div>`;
}

/** Keeps what screen readers would hear from the app's live region. */
class FakeLiveRegion implements LiveRegion {
  public readonly heard: string[] = [];

  public announce(message: string): void {
    this.heard.push(message);
  }
}

describe('RangeNameDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let range: HTMLElement & {
    step?: number;
    min?: number;
    max?: number;
    value?: RangeValue;
  };
  let liveRegion: FakeLiveRegion;

  async function create(knobs: string, step = 1): Promise<void> {
    fixture = TestBed.createComponent(HostComponent);
    range = (fixture.nativeElement as HTMLElement).querySelector('test-range');
    range.step = step;
    range.attachShadow({ mode: 'open' }).innerHTML = knobs;
    await settle();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function knobs(): HTMLElement[] {
    return [
      ...range.shadowRoot.querySelectorAll<HTMLElement>('[role="slider"]'),
    ];
  }

  /** Ionic's events for a knob moved to `value`. */
  function fire(
    type: 'ionKnobMoveStart' | 'ionInput' | 'ionKnobMoveEnd',
    value: RangeValue,
  ): void {
    range.dispatchEvent(new CustomEvent(type, { detail: { value } }));
  }

  /** A drag starts in one task and moves the knob in later ones. */
  async function startDrag(value: RangeValue): Promise<void> {
    fire('ionKnobMoveStart', value);
    await Promise.resolve();
  }

  beforeEach(() => {
    liveRegion = new FakeLiveRegion();
    TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [{ provide: LIVE_REGION, useValue: liveRegion }],
    });
    TestBed.overrideDirective(RangeNameDirective, {
      set: { selector: 'test-range' },
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', {
      A11Y: {
        RANGE_FROM: '{{name}}, von',
        RANGE_TO: '{{name}}, bis',
        RANGE_FROM_VALUE: 'von {{value}}',
        RANGE_TO_VALUE: 'bis {{value}}',
        RANGE_VALUE_OF_MAX: '{{value}} von {{max}}',
      },
    });
    translate.setTranslation('en', {
      A11Y: {
        RANGE_FROM: '{{name}}, from',
        RANGE_TO: '{{name}}, to',
        RANGE_VALUE_OF_MAX: '{{value}} of {{max}}',
      },
    });
    translate.use('de');
  });

  it('names the knob after the label and says the value with its unit', async () => {
    await create(knob(80));

    const [only] = knobs();
    expect(only.getAttribute('aria-label')).toBe('Bildqualität');
    expect(only.hasAttribute('aria-labelledby')).toBe(false);
    expect(only.getAttribute('aria-valuetext')).toBe('80 %');
  });

  it('names the lower and the upper knob of a range', async () => {
    await create(
      knob(1.5, 'knob-handle-lower') + knob(3, 'knob-handle-upper'),
      0.5,
    );

    expect(knobs().map((each) => each.getAttribute('aria-label'))).toEqual([
      'Bildqualität, von',
      'Bildqualität, bis',
    ]);
    expect(knobs().map((each) => each.getAttribute('aria-valuetext'))).toEqual([
      '1,5 %',
      '3 %',
    ]);
  });

  it('says a new value once the knob moves', async () => {
    await create(knob(80));

    knobs()[0].setAttribute('aria-valuenow', '95');
    await new Promise((resolve) => setTimeout(resolve));

    expect(knobs()[0].getAttribute('aria-valuetext')).toBe('95 %');
  });

  it('follows the label, the unit and the app language', async () => {
    await create(
      knob(1.5, 'knob-handle-lower') + knob(3, 'knob-handle-upper'),
      0.1,
    );

    fixture.componentInstance.label.set('Flow');
    fixture.componentInstance.unit.set('g/s');
    TestBed.inject(TranslateService).use('en');
    await settle();

    expect(knobs()[0].getAttribute('aria-label')).toBe('Flow, from');
    expect(knobs()[0].getAttribute('aria-valuetext')).toBe('1.5 g/s');
  });

  describe('while a knob is dragged', () => {
    beforeEach(async () => {
      await create(knob(80));
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date('2026-11-23T20:00:00Z'));
    });

    afterEach(() => jasmine.clock().uninstall());

    it('says the value the knob rests on, not the values passed on the way', async () => {
      await startDrag(80);
      // Ionic moves the knob to the finger once it has gone a few points.
      fire('ionInput', 83);
      jasmine.clock().tick(80);
      fire('ionInput', 84);
      jasmine.clock().tick(80);
      fire('ionInput', 85);
      expect(liveRegion.heard).toEqual([]);

      jasmine.clock().tick(DRAG_SETTLE_MS);
      expect(liveRegion.heard).toEqual(['85 %']);

      jasmine.clock().tick(3000);
      fire('ionKnobMoveEnd', 85);
      expect(liveRegion.heard).toEqual(['85 %']);
    });

    it('says only the final value of a short drag', async () => {
      await startDrag(80);
      fire('ionInput', 83);
      jasmine.clock().tick(80);
      fire('ionInput', 85);
      jasmine.clock().tick(80);
      fire('ionKnobMoveEnd', 85);
      jasmine.clock().tick(3000);

      expect(liveRegion.heard).toEqual(['85 %']);
    });

    it('says the current value about once a second while the knob keeps moving', async () => {
      await startDrag(80);
      for (let value = 81; value <= 105; value++) {
        fire('ionInput', value);
        jasmine.clock().tick(100);
      }
      fire('ionKnobMoveEnd', 106);

      // At 1 s, 2 s and when let go: the value of that moment.
      expect(liveRegion.heard).toEqual(['90 %', '100 %', '106 %']);
    });

    it('says a value only when it changes as spoken', async () => {
      range.step = 1;
      await startDrag(80);
      fire('ionInput', 81);
      jasmine.clock().tick(DRAG_ANNOUNCE_INTERVAL_MS);
      fire('ionInput', 81.2);
      fire('ionKnobMoveEnd', 81);

      expect(liveRegion.heard).toEqual(['81 %']);
    });

    it('says the moved end of a range', async () => {
      range.step = 0.5;
      await startDrag({ lower: 1.5, upper: 3 });
      fire('ionInput', { lower: 1.5, upper: 3.5 });
      jasmine.clock().tick(DRAG_ANNOUNCE_INTERVAL_MS);
      fire('ionInput', { lower: 1.5, upper: 4 });
      fire('ionKnobMoveEnd', { lower: 1.5, upper: 4 });
      await startDrag({ lower: 1.5, upper: 4 });
      fire('ionKnobMoveEnd', { lower: 1, upper: 4 });

      expect(liveRegion.heard).toEqual(['bis 3,5 %', 'bis 4 %', 'von 1 %']);
    });

    it('leaves a keyboard step and a value set by the app to the screen reader', () => {
      fire('ionKnobMoveStart', 80);
      fire('ionInput', 79);
      fire('ionKnobMoveEnd', 79);
      fire('ionInput', 60);

      expect(liveRegion.heard).toEqual([]);
    });

    it('does not say the value again when the knob is let go where it was last said', async () => {
      await startDrag(80);
      fire('ionInput', 83);
      jasmine.clock().tick(3000);
      fire('ionInput', 83);
      fire('ionKnobMoveEnd', 83);

      expect(liveRegion.heard).toEqual(['83 %']);
    });
  });

  describe('a keyboard step, as from the adjust gesture of a screen reader', () => {
    /** Ionic's events for a step, all sent before the keydown returns. */
    function step(before: RangeValue, after: RangeValue): void {
      fire('ionKnobMoveStart', before);
      fire('ionInput', after);
      fire('ionKnobMoveEnd', after);
    }

    it('has the new value in the knob before Ionic renders it', async () => {
      await create(knob(80));

      step(80, 79);

      // The screen reader reads the knob now, in the same task.
      expect(knobs()[0].getAttribute('aria-valuenow')).toBe('79');
      expect(knobs()[0].getAttribute('aria-valuetext')).toBe('79 %');
      await settle();
      expect(liveRegion.heard).toEqual([]);
    });

    it('has the new value in the moved knob of a range', async () => {
      await create(
        knob(1.5, 'knob-handle-lower') + knob(3, 'knob-handle-upper'),
        0.5,
      );

      step({ lower: 1.5, upper: 3 }, { lower: 1.5, upper: 3.5 });

      expect(
        knobs().map((each) => each.getAttribute('aria-valuetext')),
      ).toEqual(['1,5 %', '3,5 %']);
    });
  });

  describe('with a key step finer than the touch step', () => {
    let events: string[];

    beforeEach(async () => {
      fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.keyStep.set(0.1);
      fixture.componentInstance.unit.set('s');
      fixture.componentInstance.summary.set(
        ({ lower, upper }) => `Dauer ${+(upper - lower).toFixed(3)}`,
      );
      range = (fixture.nativeElement as HTMLElement).querySelector(
        'test-range',
      );
      Object.assign(range, {
        step: 0.001,
        min: 0,
        max: 30.025,
        value: { lower: 0, upper: 30.025 },
      });
      range.attachShadow({ mode: 'open' }).innerHTML =
        knob(0, 'knob-handle-lower') + knob(30.025, 'knob-handle-upper');
      await settle();
      events = [];
      for (const type of ['ionKnobMoveStart', 'ionChange', 'ionKnobMoveEnd']) {
        range.addEventListener(type, () => events.push(type));
      }
    });

    function press(key: string, which: 0 | 1): KeyboardEvent {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        composed: true,
        cancelable: true,
      });
      knobs()[which].dispatchEvent(event);
      return event;
    }

    it('moves a knob by the key step and says the summary with its value', () => {
      const event = press('ArrowRight', 0);

      expect(event.defaultPrevented).toBe(true);
      expect(range.value).toEqual({ lower: 0.1, upper: 30.025 });
      expect(events).toEqual([
        'ionKnobMoveStart',
        'ionChange',
        'ionKnobMoveEnd',
      ]);
      expect(knobs()[0].getAttribute('aria-valuenow')).toBe('0.1');
      expect(knobs()[0].getAttribute('aria-valuetext')).toBe(
        '0,1 s, Dauer 29.925',
      );
      expect(knobs()[1].getAttribute('aria-valuetext')).toBe(
        '30,025 s, Dauer 29.925',
      );
    });

    it('moves ten key steps with PageUp and PageDown', () => {
      press('PageDown', 1);
      expect(range.value).toEqual({ lower: 0, upper: 29.025 });

      press('PageUp', 0);
      expect(range.value).toEqual({ lower: 1, upper: 29.025 });
    });

    it('leaves other keys to the knob', () => {
      const event = press('Home', 0);

      expect(event.defaultPrevented).toBe(false);
      expect(events).toEqual([]);
    });

    it('leaves the arrows to Ionic without a key step', async () => {
      fixture.componentInstance.keyStep.set(undefined);
      await settle();

      const event = press('ArrowLeft', 1);

      expect(event.defaultPrevented).toBe(false);
      expect(range.value).toEqual({ lower: 0, upper: 30.025 });
    });
  });

  it('says the summary of a range after each knob value', async () => {
    await create(
      knob(1.5, 'knob-handle-lower') + knob(3, 'knob-handle-upper'),
      0.5,
    );
    fixture.componentInstance.summary.set(
      ({ lower, upper }) => `Länge ${upper - lower}`,
    );
    await settle();

    expect(knobs().map((each) => each.getAttribute('aria-valuetext'))).toEqual([
      '1,5 %, Länge 1.5',
      '3 %, Länge 1.5',
    ]);
  });

  it('says the summary while a knob of a range is dragged', async () => {
    await create(
      knob(1.5, 'knob-handle-lower') + knob(3, 'knob-handle-upper'),
      0.5,
    );
    fixture.componentInstance.summary.set(
      ({ lower, upper }) => `Länge ${upper - lower}`,
    );
    await settle();

    await startDrag({ lower: 1.5, upper: 3 });
    fire('ionInput', { lower: 1.5, upper: 4 });
    fire('ionKnobMoveEnd', { lower: 1.5, upper: 4 });

    expect(liveRegion.heard).toEqual(['bis 4 %, Länge 2.5']);
  });

  describe('with rangeOfMax, as on a rating', () => {
    async function createRating(value: number, max?: number): Promise<void> {
      fixture = TestBed.createComponent(HostComponent);
      fixture.componentInstance.label.set('Bewertung');
      fixture.componentInstance.unit.set('');
      fixture.componentInstance.ofMax.set(true);
      range = (fixture.nativeElement as HTMLElement).querySelector(
        'test-range',
      );
      range.step = 0.5;
      range.max = max;
      range.attachShadow({ mode: 'open' }).innerHTML = knob(value);
      await settle();
    }

    it('says the value against the maximum of the range', async () => {
      await createRating(4.5, 5);

      expect(knobs()[0].getAttribute('aria-valuetext')).toBe('4,5 von 5');
    });

    it('follows a new maximum and takes Ionic’s 100 when none is set', async () => {
      await createRating(4);
      expect(knobs()[0].getAttribute('aria-valuetext')).toBe('4 von 100');

      range.max = 5;
      knobs()[0].setAttribute('aria-valuemax', '5');
      await new Promise((resolve) => setTimeout(resolve));

      expect(knobs()[0].getAttribute('aria-valuetext')).toBe('4 von 5');
    });

    it('says a dragged value against the maximum', async () => {
      await createRating(4, 5);

      await startDrag(4);
      fire('ionKnobMoveEnd', 2.5);
      TestBed.inject(TranslateService).use('en');
      await settle();
      await startDrag(2.5);
      fire('ionKnobMoveEnd', 3);

      expect(liveRegion.heard).toEqual(['2,5 von 5', '3 of 5']);
      expect(knobs()[0].getAttribute('aria-valuetext')).toBe('3 of 5');
    });
  });

  it('keeps Ionic’s name where no label is given', async () => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.label.set('');
    range = (fixture.nativeElement as HTMLElement).querySelector('test-range');
    range.attachShadow({ mode: 'open' }).innerHTML = knob(2);
    await settle();

    expect(knobs()[0].hasAttribute('aria-label')).toBe(false);
    expect(knobs()[0].getAttribute('aria-labelledby')).toBe('range-label');
  });
});

describe('RangeNameDirective with a screen reader speaking', () => {
  /** The CDK writes a message into its live region this long after the call. */
  const CDK_WRITE_MS = 100;
  /** How long the screen reader takes to say a value, e.g. "achtzig Prozent". */
  const SPEAKING_MS = 1500;

  /**
   * A screen reader: it says one message at a time, queues a polite one and
   * drops what it is saying and what waits for an assertive one.
   */
  class ScreenReader {
    public readonly said: { message: string; at: number }[] = [];
    private queue: string[] = [];
    private timer: ReturnType<typeof setTimeout> | undefined;

    public hear(message: string, politeness: string): void {
      if (politeness === 'assertive') {
        this.queue = [];
        clearTimeout(this.timer);
        this.timer = undefined;
      }
      this.queue.push(message);
      if (this.timer === undefined) {
        this.next();
      }
    }

    private next(): void {
      const message = this.queue.shift();
      if (message === undefined) {
        this.timer = undefined;
        return;
      }
      this.said.push({ message, at: Date.now() });
      this.timer = setTimeout(() => this.next(), SPEAKING_MS);
    }
  }

  it('says the value of a dragged knob in real time, not values passed by', fakeAsync(() => {
    const screenReader = new ScreenReader();
    TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: LiveAnnouncer,
          useValue: {
            announce: (message: string, politeness: string) =>
              new Promise<void>((done) =>
                setTimeout(() => {
                  screenReader.hear(message, politeness);
                  done();
                }, CDK_WRITE_MS),
              ),
          },
        },
      ],
    });
    TestBed.overrideDirective(RangeNameDirective, {
      set: { selector: 'test-range' },
    });
    TestBed.inject(TranslateService).use('de');
    const fixture = TestBed.createComponent(HostComponent);
    const range = (fixture.nativeElement as HTMLElement).querySelector(
      'test-range',
    );
    range.attachShadow({ mode: 'open' }).innerHTML = knob(10);
    fixture.detectChanges();
    flushMicrotasks();
    const fire = (type: string, value: number) =>
      range.dispatchEvent(new CustomEvent(type, { detail: { value } }));

    // A finger drags the knob for 6 s, one step every 100 ms.
    fire('ionKnobMoveStart', 10);
    flushMicrotasks();
    for (let value = 11; value <= 70; value++) {
      fire('ionInput', value);
      tick(100);
    }
    const letGoAt = Date.now();
    fire('ionKnobMoveEnd', 70);
    flush();

    const said = screenReader.said;
    expect(said.at(-1)?.message).toBe('70 %');
    expect(said.at(-1)?.at - letGoAt).toBeLessThan(1000);
    expect(said.length).toBeLessThanOrEqual(8);
  }));
});

describe('movedKnob', () => {
  it('finds the knob whose value is new', () => {
    const before = { lower: 2, upper: 4 };
    expect(movedKnob(before, { lower: 3, upper: 4 })).toBe('lower');
    expect(movedKnob(before, { lower: 2, upper: 5 })).toBe('upper');
  });

  it('follows a knob dragged past the other one', () => {
    const before = { lower: 2, upper: 4 };
    expect(movedKnob(before, { lower: 4, upper: 5 })).toBe('upper');
    expect(movedKnob(before, { lower: 1, upper: 2 })).toBe('lower');
  });
});

describe('steppedRangeValue', () => {
  const bounds = { min: 0, max: 30.025, step: 0.001 };

  it('moves the given knob and rounds to the step', () => {
    const range = { lower: 0.2, upper: 30.025 };
    expect(steppedRangeValue(range, 'lower', 0.1, bounds)).toEqual({
      lower: 0.3,
      upper: 30.025,
    });
    expect(steppedRangeValue(range, 'upper', -0.1, bounds)).toEqual({
      lower: 0.2,
      upper: 29.925,
    });
  });

  it('stops at the ends and at the other knob', () => {
    expect(
      steppedRangeValue({ lower: 0.05, upper: 30 }, 'lower', -0.1, bounds),
    ).toEqual({ lower: 0, upper: 30 });
    expect(
      steppedRangeValue({ lower: 1, upper: 30 }, 'upper', 1, bounds),
    ).toEqual({ lower: 1, upper: 30.025 });
    expect(
      steppedRangeValue({ lower: 5, upper: 5.05 }, 'lower', 0.1, bounds),
    ).toEqual({ lower: 5.05, upper: 5.05 });
    expect(
      steppedRangeValue({ lower: 5, upper: 5.05 }, 'upper', -0.1, bounds),
    ).toEqual({ lower: 5, upper: 5 });
  });

  it('moves a single knob', () => {
    expect(steppedRangeValue(30, 'lower', 1, bounds)).toBe(30.025);
    expect(steppedRangeValue(3, 'upper', -0.1, bounds)).toBe(2.9);
  });
});

describe('rangeValueText', () => {
  it('rounds to the decimals of the step', () => {
    expect(rangeValueText(0.1 + 0.2, 0.1, 'bar', 'en')).toBe('0.3 bar');
    expect(rangeValueText(12.3456, 0.001, 's', 'de')).toBe('12,346 s');
    expect(rangeValueText(4, undefined, '', 'en')).toBe('4');
  });

  it('accepts the app’s language codes', () => {
    expect(rangeValueText(1234.5, 0.5, '', 'zh_TW')).toBe('1,234.5');
  });
});
