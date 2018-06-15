/**Core**/
import {Directive, Input, NgZone,EventEmitter,Output,ElementRef} from '@angular/core';
import {NgModel} from '@angular/forms';

@Directive({
  selector: '[prevent-characters]',
  providers: [(NgModel)],
  host: {
    '(keydown)': 'onKeyDown($event)',
    '(blur)': 'blur()',
  }
})
export class PreventCharacterDirective {
  constructor(private model: NgModel, private _ngZone: NgZone, public _el:
    ElementRef) {

  }

  @Input() get inputModel;

  onKeyDown($event) {
    let pressedKeyCode: number = $event.keyCode;

    if ($event.shiftKey == false && $event.ctrlKey == false && (pressedKeyCode >= 48 && pressedKeyCode <= 57) || (pressedKeyCode >= 96 && pressedKeyCode <= 105)) {
      // 0-9 only
      //Its okay
    }
    else if (pressedKeyCode == 8) {
      //Delete backspace ok
    }
    else if (pressedKeyCode == 190 || pressedKeyCode == 188) {
      //Comma, Point support
    }
    else {
      //Everything else we block
      $event.preventDefault();
      $event.stopPropagation();
    }

  }

  blur() {

    let val: any = this.model.control.value;
    val = val + "";
    console.log(val);
    if (val == "") {
      val = "0";
    }
    if (val.indexOf(',')) {
      val = val.replace(/,/g, '.');
    }

    console.log("set new value");
    this._ngZone.run(() => {
      this._el.nativeElement.value=parseFloat(val);
     // this.model.control.setValue(parseFloat(val));
     // this.model.viewToModelUpdate(parseFloat(val));
     // this.model.valueAccessor.writeValue(parseFloat(val));

     // this.model.valueAccessor.writeValue(parseFloat(val) + "");
    });
  }
}
