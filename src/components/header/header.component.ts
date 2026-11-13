import { Component, input } from '@angular/core';

import { IonButtons, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-header',
  imports: [IonToolbar, IonButtons, IonTitle],
  styles: `
    /**
    Removed, because on iOS the margin-top did spawn the element more to the bottom
        ion-toolbar:has(ion-title .subtitle) {
      margin-top: 12px;
    }**/
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
        <span
          [attr.role]="heading() ? 'heading' : null"
          [attr.aria-level]="heading() ? 1 : null"
          >{{ title() }}</span
        >
        @if (subtitle()) {
          <p class="subtitle">
            <span>{{ subtitle() }}</span>
          </p>
        }
      </ion-title>
    </ion-toolbar>
  `,
})
export class HeaderComponent {
  title = input.required<string>();
  subtitle = input<string>();
  /**
   * Exposes the title as the page's level-1 heading, for screens whose content
   * is structured by headings below it.
   */
  heading = input(false);
}
