import { Component, input } from '@angular/core';
import { IonToolbar, IonButtons, IonTitle } from '@ionic/angular/standalone';

@Component({
  selector: 'app-header',
  imports: [IonToolbar, IonButtons, IonTitle],
  template: `
    <ion-toolbar>
      <ion-buttons slot="start">
        <ng-content select="[header-slot=start]"></ng-content>
      </ion-buttons>
      <ion-buttons slot="end">
        <ng-content select="[header-slot=end]"></ng-content>
      </ion-buttons>
      <ion-title>{{ title() }}</ion-title>
    </ion-toolbar>
  `,
})
export class HeaderComponent {
  title = input.required<string>();
}
