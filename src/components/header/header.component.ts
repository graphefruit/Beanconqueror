import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IonButtons, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-header',
  imports: [IonToolbar, IonButtons, IonTitle],
  styles: `
    /* ion-title cuts a long title off with an ellipsis; it wraps instead. */
    [role='heading'] {
      white-space: normal;
      overflow-wrap: break-word;
    }
    /**
    Removed, because on iOS the margin-top did spawn the element more to the bottom
        ion-toolbar:has(ion-title .subtitle) {
      margin-top: 12px;
    }**/
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <ion-toolbar>
      <ion-buttons slot="start">
        <ng-content select="[header-slot=start]" />
      </ion-buttons>
      <ion-buttons slot="end">
        <ng-content select="[header-slot=end]" />
      </ion-buttons>
      <ion-title>
        <span role="heading" aria-level="1">{{ title() }}</span>
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
}
