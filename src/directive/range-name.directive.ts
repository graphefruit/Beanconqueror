import {
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
  step?: number;
  componentOnReady?: () => Promise<unknown>;
};

/** The value of an ion-range: a number, or both ends with two knobs. */
export type RangeValue = number | { lower: number; upper: number };

type KnobMoveEvent = CustomEvent<{ value: RangeValue }>;

/**
 * While a knob is dragged, its value is spoken at most this often, so a value
 * can be heard to its end before the next one cuts it off.
 */
export const DRAG_ANNOUNCE_INTERVAL_MS = 1000;

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
 * the bare number. Ionic names a knob after the range's own label, which the
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
 * so while a knob is dragged its value is announced, at most once per
 * DRAG_ANNOUNCE_INTERVAL_MS and assertively, so a newer value cuts off an
 * older one instead of waiting behind it. When the knob is let go, its value
 * is announced unless it was the last one spoken.
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
  /**
   * The value shown next to a single knob when it is not the knob's own, e.g.
   * the interval that is in effect; said instead of the knob's value.
   */
  public readonly rangeShownValue = input<number>();

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
          attributeFilter: ['aria-valuenow'],
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
    });
    destroyRef.onDestroy(() => {
      observer?.disconnect();
      listening.abort();
      clearTimeout(this.timer);
    });

    effect(() => {
      this.rangeLabel();
      this.rangeUnit();
      this.rangeShownValue();
      this.language();
      if (this.rendered()) {
        this.describeKnobs();
      }
    });
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
    this.waiting = message === this.spoken ? undefined : message;
    if (this.waiting === undefined || this.timer !== undefined) {
      return;
    }
    const wait = this.spokenAt + DRAG_ANNOUNCE_INTERVAL_MS - Date.now();
    if (wait > 0) {
      this.timer = setTimeout(() => {
        this.timer = undefined;
        if (this.waiting !== undefined) {
          this.say(this.waiting);
        }
      }, wait);
    } else {
      this.say(message);
    }
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
    const language = this.translate.getCurrentLang() ?? 'en';
    const say = (knobValue: number) =>
      rangeValueText(knobValue, this.host.step, this.rangeUnit(), language);
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
    return String(
      this.translate.instant(
        this.dragKnob === 'upper'
          ? 'A11Y.RANGE_TO_VALUE'
          : 'A11Y.RANGE_FROM_VALUE',
        { value: say(value[this.dragKnob]) },
      ),
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
    const language = this.translate.getCurrentLang() ?? 'en';
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
      const shown =
        this.rangeShownValue() ?? Number(knob.getAttribute('aria-valuenow'));
      if (Number.isFinite(shown)) {
        const text = rangeValueText(
          shown,
          this.host.step,
          this.rangeUnit(),
          language,
        );
        if (knob.getAttribute('aria-valuetext') !== text) {
          knob.setAttribute('aria-valuetext', text);
        }
      }
    }
  }
}
