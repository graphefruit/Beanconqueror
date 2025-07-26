import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[disable-double-click]',
  standalone: false,
})
export class DisableDoubleClickDirective {
  constructor() {}

  @HostListener('click', ['$event'])
  public clickEvent(_event) {
    _event.srcElement.setAttribute('disabled', true);
    setTimeout(() => {
      _event.srcElement.removeAttribute('disabled');
    }, 500);
  }
}
