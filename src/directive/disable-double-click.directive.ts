import {Directive, HostListener} from '@angular/core';


@Directive({
  selector: '[disable-double-click]',
})
export class DisableDoubleClickDirective {

  constructor() {
  }

  @HostListener('click', ['$event'])
  public clickEvent(_event) {
    console.log('bla');
    _event.srcElement.setAttribute('disabled', true);
    setTimeout(() => {
      _event.srcElement.removeAttribute('disabled');
    }, 500);
  }


}
