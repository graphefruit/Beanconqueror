/** Core */
import {Directive} from '@angular/core';
import {NgModel} from '@angular/forms';

@Directive({
  selector: '[ngModel][prevent-characters]',
  providers: [NgModel],
  host: {
    '(keydown)': 'onKeyDown($event)',
    '(ionBlur)': 'blur()'
  }
})
export class PreventCharacterDirective {

  constructor (private readonly model: NgModel) {

  }

  // @Output() ngModelChange:EventEmitter<any> = new EventEmitter();
  public onKeyDown ($event): void {
    const pressedKeyCode: number = $event.keyCode;

    if (!$event.shiftKey && !$event.ctrlKey && (pressedKeyCode >= 48 && pressedKeyCode <= 57) ||
      (pressedKeyCode >= 96 && pressedKeyCode <= 105)) {
      // 0-9 only
      // Its okay
    } else if (pressedKeyCode === 8) {
      // Delete backspace ok
    } else if (pressedKeyCode === 190 || pressedKeyCode === 188) {
      // Comma, Point support
    } else {
      // Everything else we block
      $event.preventDefault();
      $event.stopPropagation();
    }

  }

  public blur (): void {

    let val: any = this.model.control.value;

    // Value needs to be combined as a string
    // tslint:disable-next-line
    val = val + '';
    console.log(val);
    if (val === '') {
      val = '0';
    }
    if (val.indexOf(',')) {
      val = val.replace(/,/g, '.');
    }

    // Emit worked aswell but I don't know what its doing in depth
    // this.ngModelChange.emit(parseFloat(val));

    this.model.control.setValue(parseFloat(val));

  }
}
