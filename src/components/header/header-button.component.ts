import { Component, input, output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { LongPressDirective } from '../../directive/long-press.directive';
import { ShortPressDirective } from '../../directive/short-press.directive';

@Component({
  selector: 'app-header-button',
  imports: [IonButton, IonIcon, LongPressDirective, ShortPressDirective],
  template: `
    @if (longPressEnabled()) {
      <ion-button
        tappable
        [class]="buttonClass()"
        fill="clear"
        (short-press)="clicked.emit($event)"
        (long-press)="longPressed.emit($event)"
      >
        <ion-icon class="ion-color-accent" [name]="icon()" slot="icon-only" />
      </ion-button>
    } @else {
      <ion-button
        tappable
        [class]="buttonClass()"
        fill="clear"
        (click)="clicked.emit($event)"
      >
        <ion-icon class="ion-color-accent" [name]="icon()" slot="icon-only" />
      </ion-button>
    }
  `,
})
export class HeaderButtonComponent {
  icon = input.required<string>();
  buttonClass = input('big-add-icon');
  longPressEnabled = input(false);
  clicked = output<Event>();
  longPressed = output<Event>();
}
