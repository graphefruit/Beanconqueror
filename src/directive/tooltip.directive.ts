import {
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  Input,
} from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { UIAlert } from '../services/uiAlert';

@Directive({ selector: '[tooltip]' })
export class TooltipDirective {
  private readonly uiAlert = inject(UIAlert);
  private readonly translate = inject(TranslateService);

  @Input('tooltip') public tooltip: string;

  // The hosts are icons without text: the name says what a tap offers.
  @HostBinding('attr.aria-label')
  public get name(): string {
    return this.translate.instant('MORE_INFORMATION') as string;
  }

  @HostListener('click', ['$event'])
  public onClick($event) {
    this.uiAlert.showMessage(this.tooltip);
  }
}
