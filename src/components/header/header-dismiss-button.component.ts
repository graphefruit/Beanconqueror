import { ChangeDetectionStrategy, Component, output } from '@angular/core';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderButtonComponent } from './header-button.component';

@Component({
  selector: 'app-header-dismiss-button',
  imports: [HeaderButtonComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-header-button
      icon="beanconqueror-back"
      buttonClass="big-icon-only"
      [ariaLabel]="'BACK' | translate"
      (clicked)="dismissed.emit()"
    />
  `,
})
export class HeaderDismissButtonComponent {
  dismissed = output<void>();
}
