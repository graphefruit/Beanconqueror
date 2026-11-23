import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { LIVE_REGION, LiveRegion } from '../../services/a11y/live-region';
import {
  DRAG_ANNOUNCE_INTERVAL_MS,
  movedKnob,
  RangeNameDirective,
  RangeValue,
  rangeValueText,
} from '../range-name.directive';

/**
 * Ionic's components do not load in unit tests, so the directive runs on a
 * stand-in element with the knobs ion-range renders into its shadow root.
 * e2e/a11y-forms.spec.ts covers the real one.
 */
@Component({
  imports: [RangeNameDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<test-range [rangeLabel]="label()" [rangeUnit]="unit()" />`,
})
class HostComponent {
  public readonly label = signal('Bildqualität');
  public readonly unit = signal('%');
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
  let range: HTMLElement & { step?: number };
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
      },
    });
    translate.setTranslation('en', {
      A11Y: { RANGE_FROM: '{{name}}, from', RANGE_TO: '{{name}}, to' },
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

    it('says the value as it changes, without a flood, and once more when let go', async () => {
      await startDrag(80);
      fire('ionInput', 81);
      fire('ionInput', 82);
      fire('ionInput', 83);
      expect(liveRegion.heard).toEqual(['81 %']);

      jasmine.clock().tick(DRAG_ANNOUNCE_INTERVAL_MS);
      expect(liveRegion.heard).toEqual(['81 %', '83 %']);

      fire('ionInput', 84);
      fire('ionKnobMoveEnd', 85);
      jasmine.clock().tick(DRAG_ANNOUNCE_INTERVAL_MS);
      expect(liveRegion.heard).toEqual(['81 %', '83 %', '85 %']);
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
