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

type RangeElement = HTMLElement & {
  step?: number;
  componentOnReady?: () => Promise<unknown>;
};

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
 */
@Directive({ selector: 'ion-range' })
export class RangeNameDirective {
  private readonly host =
    inject<ElementRef<RangeElement>>(ElementRef).nativeElement;
  private readonly translate = inject(TranslateService);

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
    destroyRef.onDestroy(() => observer?.disconnect());

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
