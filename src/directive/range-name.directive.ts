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

import {
  Announcer,
  ProgressAnnouncement,
} from '../services/a11y/announcer.service';

type RangeElement = HTMLElement & {
  step?: number;
  componentOnReady?: () => Promise<unknown>;
};

/** The value of an ion-range: a number, or both ends with two knobs. */
export type RangeValue = number | { lower: number; upper: number };

type KnobMoveEvent = CustomEvent<{ value: RangeValue }>;

/**
 * While a knob is dragged, its value is spoken at most this often. A screen
 * reader queues polite messages, so faster ones would still be spoken after
 * the knob was let go.
 */
export const DRAG_ANNOUNCE_INTERVAL_MS = 1000;

/**
 * Live region key of a dragged value: a value the screen reader has not been
 * handed yet is dropped for a newer one, so it never speaks a passed value.
 */
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
 * While a knob is dragged, its value is announced as it changes and once more
 * when it is let go: a screen reader does not speak value changes of a knob
 * moved by touch. A step from the keyboard, which is also how a screen
 * reader's own adjust gesture arrives, is spoken by the screen reader itself.
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
  private dragAnnouncement: ProgressAnnouncement | undefined;

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
      this.dragAnnouncement?.end();
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
    // Ionic starts and ends a keyboard step within one task, a drag ends in a
    // later one: only a move still going on after this task is a drag.
    queueMicrotask(() => (this.dragging = this.knobMoving));
  }

  private onInput(event: KnobMoveEvent): void {
    if (!this.dragging) {
      return;
    }
    const message = this.dragMessage(event.detail.value);
    if (this.dragAnnouncement) {
      this.dragAnnouncement.update(message);
    } else {
      this.dragAnnouncement = this.announcer.startProgress(
        message,
        DRAG_ANNOUNCE_INTERVAL_MS,
        RANGE_VALUE_KEY,
      );
    }
  }

  private onKnobMoveEnd(event: KnobMoveEvent): void {
    const dragged = this.dragging;
    this.knobMoving = false;
    this.dragging = false;
    this.dragAnnouncement?.end();
    this.dragAnnouncement = undefined;
    if (dragged) {
      this.announcer.announce(
        this.dragMessage(event.detail.value),
        'polite',
        RANGE_VALUE_KEY,
      );
    }
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

  private describeKnobs(): void {
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
      const value =
        this.rangeShownValue() ?? Number(knob.getAttribute('aria-valuenow'));
      if (Number.isFinite(value)) {
        const text = rangeValueText(
          value,
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
