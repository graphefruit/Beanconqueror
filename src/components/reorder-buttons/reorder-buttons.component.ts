import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  output,
} from '@angular/core';

import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronDownOutline, chevronUpOutline } from 'ionicons/icons';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Announcer } from '../../services/a11y/announcer.service';

/** An entry moves from one position to another, counted from 0. */
export interface ReorderMove {
  from: number;
  to: number;
}

/**
 * Moves an entry of a sortable list one place up or down: the alternative to
 * dragging its handle, which keyboards and screen readers cannot do. The new
 * position is announced, and the focus stays on the button just used, or on
 * the other one where the entry reached the start or the end of the list.
 */
@Component({
  selector: 'app-reorder-buttons',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonIcon, TranslatePipe],
  template: `
    <ion-button
      class="move-up"
      fill="clear"
      [disabled]="isFirst()"
      [attr.aria-label]="'A11Y.MOVE_UP' | translate: { name: name() }"
      (click)="move(-1)"
    >
      <ion-icon aria-hidden="true" slot="icon-only" name="chevron-up-outline" />
    </ion-button>
    <ion-button
      class="move-down"
      fill="clear"
      [disabled]="isLast()"
      [attr.aria-label]="'A11Y.MOVE_DOWN' | translate: { name: name() }"
      (click)="move(1)"
    >
      <ion-icon
        aria-hidden="true"
        slot="icon-only"
        name="chevron-down-outline"
      />
    </ion-button>
  `,
  styles: `
    :host {
      display: flex;
    }
  `,
})
export class ReorderButtonsComponent {
  private readonly announcer = inject(Announcer);
  private readonly translate = inject(TranslateService);
  private readonly injector = inject(Injector);
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Position of the entry in the list, counted from 0. */
  public readonly index = input.required<number>();
  /** Number of entries in the list. */
  public readonly count = input.required<number>();
  /** Name of the entry, e.g. "Grind size". */
  public readonly name = input.required<string>();
  public readonly moved = output<ReorderMove>();

  protected readonly isFirst = computed(() => this.index() <= 0);
  protected readonly isLast = computed(() => this.index() >= this.count() - 1);

  constructor() {
    addIcons({ chevronUpOutline, chevronDownOutline });
  }

  protected move(step: -1 | 1): void {
    const from = this.index();
    const to = from + step;
    if (to < 0 || to >= this.count()) {
      return;
    }
    this.moved.emit({ from, to });
    this.announcer.announce(
      String(
        this.translate.instant('A11Y.MOVED_TO_POSITION', {
          name: this.name(),
          position: to + 1,
          count: this.count(),
        }),
      ),
    );
    // The list puts the entry, and these buttons with it, at its new place,
    // which takes the focus off the button.
    afterNextRender(
      () => {
        const used = step < 0 ? '.move-up' : '.move-down';
        const other = step < 0 ? '.move-down' : '.move-up';
        const atEnd = step < 0 ? this.isFirst() : this.isLast();
        const button = this.host.querySelector<HTMLElement>(
          atEnd ? other : used,
        );
        (
          button?.shadowRoot?.querySelector<HTMLElement>('button') ?? button
        )?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
}
