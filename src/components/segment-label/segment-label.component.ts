import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

/**
 * The label of a tab with the number of its entries on a line below:
 * "( 4 )", or "( 2 / 4 )" while a filter or search hides some. Screen readers
 * would read the brackets and the slash, so they get the label with the
 * number in words instead: "Available, 4 in total", "Frozen, 2 of 4 shown".
 */
@Component({
  selector: 'app-segment-label',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span aria-hidden="true"
      >{{ label() }}<br /><span class="value"
        >( {{ shownCount() }} )</span
      ></span
    ><span class="visually-hidden"
      >{{ label() }}, {{ spoken().key | translate: spoken().params }}</span
    >`,
})
export class SegmentLabelComponent {
  public readonly label = input.required<string>();
  public readonly shown = input.required<number>();
  public readonly total = input.required<number>();

  private readonly filtered = computed(() => this.shown() !== this.total());

  protected readonly shownCount = computed(() =>
    this.filtered() ? `${this.shown()} / ${this.total()}` : `${this.total()}`,
  );

  protected readonly spoken = computed(() =>
    this.filtered()
      ? {
          key: 'A11Y.COUNT_SHOWN',
          params: { shown: this.shown(), total: this.total() },
        }
      : { key: 'A11Y.COUNT_TOTAL', params: { total: this.total() } },
  );
}
