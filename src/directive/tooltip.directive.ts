import {
  Directive,
  ElementRef,
  HostListener,
  inject,
  Input,
} from '@angular/core';

import { UIAlert } from '../services/uiAlert';

@Directive({ selector: '[tooltip]' })
export class TooltipDirective {
  private readonly uiAlert = inject(UIAlert);

  @Input('tooltip') public tooltip: string;

  @HostListener('click', ['$event'])
  public onClick($event) {
    this.uiAlert.showMessage(this.tooltip);
  }
}
