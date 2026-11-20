import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import { IonButton, IonIcon } from '@ionic/angular';

import { LongPressDirective } from '../../directive/long-press.directive';

@Component({
  selector: 'app-header-button',
  imports: [IonButton, IonIcon, LongPressDirective],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (longPressEnabled()) {
      <ion-button
        tappable
        [class]="buttonClass()"
        [attr.aria-label]="ariaLabel() || null"
        fill="clear"
        (click)="clicked.emit($event)"
        (long-press)="longPressed.emit($event)"
      >
        <ion-icon
          aria-hidden="true"
          class="ion-color-accent"
          [name]="icon()"
          slot="icon-only"
        />
      </ion-button>
    } @else {
      <ion-button
        tappable
        [class]="buttonClass()"
        [attr.aria-label]="ariaLabel() || null"
        fill="clear"
        (click)="clicked.emit($event)"
      >
        <ion-icon
          aria-hidden="true"
          class="ion-color-accent"
          [name]="icon()"
          slot="icon-only"
        />
      </ion-button>
    }
  `,
})
export class HeaderButtonComponent {
  icon = input.required<string>();
  ariaLabel = input<string>();
  buttonClass = input('big-add-icon');
  longPressEnabled = input(false);
  clicked = output<Event>();
  longPressed = output<Event>();
}
