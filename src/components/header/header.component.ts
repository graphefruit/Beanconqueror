import { Component, input } from '@angular/core';
import { IonToolbar, IonButtons, IonTitle } from '@ionic/angular/standalone';

@Component({
  selector: 'app-header',
  imports: [IonToolbar, IonButtons, IonTitle],
  styles: `
    ion-toolbar:has(ion-title .subtitle) {
      margin-top: 12px;
    }
  `,
  template: `
    <ion-toolbar>
      <ion-buttons slot="start">
        <ng-content select="[header-slot=start]"></ng-content>
      </ion-buttons>
      <ion-buttons slot="end">
        <ng-content select="[header-slot=end]"></ng-content>
      </ion-buttons>
      <ion-title>
        <span>{{ title() }}</span>
        @if (subtitle()) {
          <p class="subtitle">{{ subtitle() }}</p>
        }
      </ion-title>
    </ion-toolbar>
  `,
})
export class HeaderComponent {
  title = input.required<string>();
  subtitle = input<string>();
}
