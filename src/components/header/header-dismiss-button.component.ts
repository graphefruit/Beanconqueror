import { Component, output } from '@angular/core';
import { HeaderButtonComponent } from './header-button.component';

@Component({
  selector: 'app-header-dismiss-button',
  imports: [HeaderButtonComponent],
  template: `
    <app-header-button
      icon="beanconqueror-back"
      buttonClass="big-icon-only"
      (clicked)="dismissed.emit()"
    />
  `,
})
export class HeaderDismissButtonComponent {
  dismissed = output<void>();
}
