import {Directive, ElementRef, HostListener, Input} from '@angular/core';
import {UIAlert} from '../services/uiAlert';

@Directive({
  selector: '[tooltip]',
})
export class TooltipDirective {

  @Input('tooltip') public tooltip: string;

  constructor(el: ElementRef,
              private readonly uiAlert: UIAlert) {
    // el.nativeElement.style.backgroundColor = 'yellow';
  }

  @HostListener('click', ['$event'])
  public onClick($event) {
    this.uiAlert.showMessage(this.tooltip);
  }


}
