import {
  booleanAttribute,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { TranslateService } from '@ngx-translate/core';

import { Announcer } from '../services/a11y/announcer.service';

type RangeElement = HTMLElement & {
  value?: RangeValue;
  step?: number;
  min?: number | string;
  max?: number | string;
  componentOnReady?: () => Promise<unknown>;
};

/** The value of an ion-range: a number, or both ends with two knobs. */
export type RangeValue = number | { lower: number; upper: number };

/** Keys that move a knob by key steps, and by how many. */
const KEY_STEPS: Readonly<Record<string, number>> = {
  ArrowRight: 1,
  ArrowUp: 1,
  ArrowLeft: -1,
  ArrowDown: -1,
  PageUp: 10,
  PageDown: -10,
};

type KnobMoveEvent = CustomEvent<{ value: RangeValue }>;

/**
 * While a knob is dragged, its value is spoken at most this often, so a value
 * can be heard to its end before the next one cuts it off.
 */
export const DRAG_ANNOUNCE_INTERVAL_MS = 1000;

/**
 * A dragged value is said once the knob has rested on it this long, so the
 * values a finger passes on its way are not said.
 */
export const DRAG_SETTLE_MS = 300;

/** Live region key of a dragged value: a newer one replaces it while it waits. */
export const RANGE_VALUE_KEY = 'range-value';

/**
 * Which knob of a two-knob range moved from `before` to `after`. The moved
 * knob is the one whose value is new; a knob dragged past the other one
 * swaps lower and upper, so the other end keeps a value it had before.
 */
export function movedKnob(
  before: RangeValue,
  after: { lower: number; upper: number },
): 'lower' | 'upper' {
  const old =
    typeof before === 'number' ? [before] : [before.lower, before.upper];
  return old.includes(after.lower) ? 'upper' : 'lower';
}

/**
 * The value after `knob` moved by `delta`, rounded to the decimals of `step`.
 * A knob stops at the other knob and at the ends of the range.
 */
export function steppedRangeValue(
  value: RangeValue,
  knob: 'lower' | 'upper',
  delta: number,
  bounds: { min: number; max: number; step: number },
): RangeValue {
  const decimals = decimalsOf(bounds.step);
  const move = (from: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Number((from + delta).toFixed(decimals))));
  if (typeof value === 'number') {
    return move(value, bounds.min, bounds.max);
  }
  return knob === 'lower'
    ? { ...value, lower: move(value.lower, bounds.min, value.upper) }
    : { ...value, upper: move(value.upper, value.lower, bounds.max) };
}

/** Decimal places of `step`, so 0.05 gives 2 and 1 gives 0. */
function decimalsOf(step: number | undefined): number {
  const [, decimals = ''] = String(step ?? 1).split('.');
  return Math.min(decimals.length, 3);
}

/**
 * What a screen reader says for a knob at `value`: the number in the format
 * of `language`, with the unit shown next to the slider, e.g. "1,5 g/s".
 */
export function rangeValueText(
  value: number,
  step: number | undefined,
  unit: string,
  language: string,
): string {
  const decimals = decimalsOf(step);
  let number: string;
  try {
    number = new Intl.NumberFormat(language.replace('_', '-'), {
      maximumFractionDigits: decimals,
    }).format(value);
  } catch {
    number = String(+value.toFixed(decimals));
  }
  return unit ? `${number} ${unit}` : number;
}

/**
 * Names the knobs of an ion-range after the label shown above the slider
 * (`rangeLabel`) and says their value with its unit (`rangeUnit`) instead of
 * the bare number, or with `rangeOfMax` together with the range's maximum,
 * e.g. "4 of 5". Ionic names a knob after the range's own label, which the
 * app does not use, and announces only the number. With two knobs, the lower
 * one is named "from" and the upper one "to".
 *
 * A step from the keyboard, which is also how the adjust gesture of VoiceOver
 * and TalkBack (swipe up or down) arrives, is read by the screen reader itself
 * right after the step. So the step's value is written into the knob before
 * the screen reader reads it, not only when Ionic renders the knob again, and
 * it is not announced: that would be a second message per step, and those
 * pile up in the screen reader's queue while the user swipes on.
 *
 * A screen reader does not speak value changes of a knob dragged by touch,
 * so while a knob is dragged its value is announced: once the knob has rested
 * on it for DRAG_SETTLE_MS, or while it keeps moving, its value of that moment
 * DRAG_ANNOUNCE_INTERVAL_MS after the first unspoken change. On a fine slider
 * the first few points of a drag pass several values, and only the one the
 * knob reaches is said. Announcements are at most DRAG_ANNOUNCE_INTERVAL_MS
 * apart and assertive, so a newer value cuts off an older one instead of
 * waiting behind it. When the knob is let go, its value is announced unless
 * it was the last one spoken.
 */
@Directive({ selector: 'ion-range' })
export class RangeNameDirective {
  private readonly host =
    inject<ElementRef<RangeElement>>(ElementRef).nativeElement;
  private readonly translate = inject(TranslateService);
  private readonly announcer = inject(Announcer);

  /** The label shown with the slider, e.g. "Image quality". */
  public readonly rangeLabel = input<string>();
  /** The unit shown with the value, e.g. "%" or "g/s". */
  public readonly rangeUnit = input<string>('');
  /** Says the value against the maximum, e.g. "4 of 5" on a rating. */
  public readonly rangeOfMax = input(false, { transform: booleanAttribute });
  /** Says a value in words of its own, e.g. a time with what a graph shows at it. */
  public readonly rangeValueFormat = input<(value: number) => string>();
  /**
   * What an arrow key moves a knob by, ten of them for PageUp/PageDown, when
   * the range's own step is too fine for the keyboard.
   */
  public readonly rangeKeyStep = input<number>();
  /** Said after the value of a two-knob range, e.g. what the range gives. */
  public readonly rangeSummary =
    input<(value: { lower: number; upper: number }) => string>();

  private readonly rendered = signal(false);
  private readonly language = toSignal(this.translate.onLangChange);

  private knobMoving = false;
  private dragging = false;
  private dragValue: RangeValue = 0;
  private dragKnob: 'lower' | 'upper' = 'lower';
  /** The dragged value last handed to the screen reader, and when. */
  private spoken = '';
  private spokenAt = Number.NEGATIVE_INFINITY;
  private waiting: string | undefined;
  private waitingSince = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const zone = inject(NgZone);
    let observer: MutationObserver | undefined;
    const loaded = this.host.componentOnReady?.() ?? Promise.resolve();
    void loaded.then(() => {
      const root = this.host.shadowRoot;
      if (!root || destroyRef.destroyed) {
        return;
      }
      this.rendered.set(true);
      // Ionic renders the knobs again when a value or the knob count changes.
      zone.runOutsideAngular(() => {
        observer = new MutationObserver(() => this.describeKnobs());
        observer.observe(root, {
          subtree: true,
          childList: true,
          attributeFilter: ['aria-valuenow', 'aria-valuemax'],
        });
      });
    });
    const listening = new AbortController();
    zone.runOutsideAngular(() => {
      const listen = (type: string, handle: (event: KnobMoveEvent) => void) =>
        this.host.addEventListener(type, handle, {
          signal: listening.signal,
        });
      listen('ionKnobMoveStart', (event) => this.onKnobMoveStart(event));
      listen('ionInput', (event) => this.onInput(event));
      listen('ionKnobMoveEnd', (event) => this.onKnobMoveEnd(event));
      // Before the knob's own handler, which steps by the range's step.
      this.host.addEventListener('keydown', (event) => this.onKeyDown(event), {
        capture: true,
        signal: listening.signal,
      });
    });
    destroyRef.onDestroy(() => {
      observer?.disconnect();
      listening.abort();
      clearTimeout(this.timer);
    });

    effect(() => {
      this.rangeLabel();
      this.rangeUnit();
      this.rangeOfMax();
      this.rangeValueFormat();
      this.rangeSummary();
      this.language();
      if (this.rendered()) {
        this.describeKnobs();
      }
    });
  }

  /** Moves the focused knob by key steps, with the events of an Ionic step. */
  private onKeyDown(event: KeyboardEvent): void {
    const keyStep = this.rangeKeyStep();
    const steps = KEY_STEPS[event.key];
    const knob = event.composedPath()[0];
    if (!keyStep || !steps || !(knob instanceof HTMLElement)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const before = this.host.value ?? 0;
    const after = steppedRangeValue(
      before,
      knob.part.contains('knob-handle-upper') ? 'upper' : 'lower',
      steps * keyStep,
      {
        min: Number(this.host.min ?? 0),
        max: Number(this.host.max ?? 100),
        step: this.host.step,
      },
    );
    const emit = (type: string) =>
      this.host.dispatchEvent(
        new CustomEvent(type, { detail: { value: after } }),
      );
    emit('ionKnobMoveStart');
    // Ionic emits ionInput for the new value.
    this.host.value = after;
    emit('ionChange');
    emit('ionKnobMoveEnd');
  }

  private onKnobMoveStart(event: KnobMoveEvent): void {
    this.knobMoving = true;
    this.dragValue = event.detail.value;
    this.spoken = '';
    // Ionic starts and ends a keyboard step within one task, a drag ends in a
    // later one: only a move still going on after this task is a drag.
    queueMicrotask(() => (this.dragging = this.knobMoving));
  }

  private onInput(event: KnobMoveEvent): void {
    if (!this.dragging) {
      return;
    }
    const message = this.dragMessage(event.detail.value);
    if (message === this.waiting) {
      return;
    }
    clearTimeout(this.timer);
    this.timer = undefined;
    if (message === this.spoken) {
      this.waiting = undefined;
      return;
    }
    const now = Date.now();
    if (this.waiting === undefined) {
      this.waitingSince = now;
    }
    this.waiting = message;
    const due = Math.max(
      this.spokenAt + DRAG_ANNOUNCE_INTERVAL_MS,
      Math.min(
        now + DRAG_SETTLE_MS,
        this.waitingSince + DRAG_ANNOUNCE_INTERVAL_MS,
      ),
    );
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.say(message);
    }, due - now);
  }

  private onKnobMoveEnd(event: KnobMoveEvent): void {
    const dragged = this.dragging;
    this.knobMoving = false;
    this.dragging = false;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.waiting = undefined;
    // Ionic renders the knob after the step, a screen reader reads it at once.
    this.describeKnobs(event.detail.value);
    if (dragged) {
      const message = this.dragMessage(event.detail.value);
      if (message !== this.spoken) {
        this.say(message);
      }
    }
  }

  private say(message: string): void {
    this.waiting = undefined;
    this.spoken = message;
    this.spokenAt = Date.now();
    this.announcer.announce(message, 'assertive', RANGE_VALUE_KEY);
  }

  /** Says the value of the knob being dragged, e.g. "80 %" or "to 3.5". */
  private dragMessage(value: RangeValue): string {
    const say = (knobValue: number) => this.valueText(knobValue);
    if (typeof value === 'number') {
      return say(value);
    }
    if (
      typeof this.dragValue === 'number' ||
      value.lower !== this.dragValue.lower ||
      value.upper !== this.dragValue.upper
    ) {
      this.dragKnob = movedKnob(this.dragValue, value);
      this.dragValue = value;
    }
    return this.withSummary(
      String(
        this.translate.instant(
          this.dragKnob === 'upper'
            ? 'A11Y.RANGE_TO_VALUE'
            : 'A11Y.RANGE_FROM_VALUE',
          { value: say(value[this.dragKnob]) },
        ),
      ),
      value,
    );
  }

  /** `text`, followed by the summary of a two-knob `value` if there is one. */
  private withSummary(
    text: string,
    value: { lower: number; upper: number } | undefined,
  ): string {
    const summary = value ? this.rangeSummary()?.(value) : undefined;
    return summary ? `${text}, ${summary}` : text;
  }

  /** What a screen reader says for a knob at `value`, e.g. "80 %" or "4 of 5". */
  private valueText(value: number): string {
    const format = this.rangeValueFormat();
    if (format) {
      return format(value);
    }
    const language = this.translate.getCurrentLang() ?? 'en';
    const text = rangeValueText(
      value,
      this.host.step,
      this.rangeUnit(),
      language,
    );
    if (!this.rangeOfMax()) {
      return text;
    }
    return String(
      this.translate.instant('A11Y.RANGE_VALUE_OF_MAX', {
        value: text,
        max: rangeValueText(
          Number(this.host.max ?? 100),
          this.host.step,
          '',
          language,
        ),
      }),
    );
  }

  /**
   * Names the knobs and says their value. `value` is the range's value when
   * it is newer than the knobs' aria-valuenow, i.e. before Ionic renders.
   */
  private describeKnobs(value?: RangeValue): void {
    const knobs =
      this.host.shadowRoot?.querySelectorAll<HTMLElement>('[role="slider"]') ??
      [];
    const label = this.rangeLabel()?.trim();
    let both: { lower: number; upper: number } | undefined;
    if (typeof value === 'object') {
      both = value;
    } else if (knobs.length === 2) {
      const [lower, upper] = [...knobs]
        .map((knob) => Number(knob.getAttribute('aria-valuenow')))
        .sort((a, b) => a - b);
      both =
        Number.isFinite(lower) && Number.isFinite(upper)
          ? { lower, upper }
          : undefined;
    }
    for (const knob of knobs) {
      if (label) {
        const name =
          knobs.length < 2
            ? label
            : String(
                this.translate.instant(
                  knob.part.contains('knob-handle-upper')
                    ? 'A11Y.RANGE_TO'
                    : 'A11Y.RANGE_FROM',
                  { name: label },
                ),
              );
        if (knob.getAttribute('aria-label') !== name) {
          knob.setAttribute('aria-label', name);
        }
        // Ionic points to its own empty label, which would win over the name.
        knob.removeAttribute('aria-labelledby');
      }
      if (value !== undefined) {
        const now = String(
          typeof value === 'number'
            ? value
            : value[
                knob.part.contains('knob-handle-upper') ? 'upper' : 'lower'
              ],
        );
        if (knob.getAttribute('aria-valuenow') !== now) {
          knob.setAttribute('aria-valuenow', now);
        }
      }
      const knobValue = Number(knob.getAttribute('aria-valuenow'));
      if (Number.isFinite(knobValue)) {
        const text = this.withSummary(this.valueText(knobValue), both);
        if (knob.getAttribute('aria-valuetext') !== text) {
          knob.setAttribute('aria-valuetext', text);
        }
      }
    }
  }
}
