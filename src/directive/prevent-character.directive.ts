import {Directive, HostListener} from '@angular/core';
import {NgModel} from '@angular/forms';

@Directive({
    selector: '[ngModel][prevent-characters]',
})
export class PreventCharacterDirective {

    constructor(private readonly model: NgModel) {

    }

  @HostListener('ionBlur', ['$event.target'])
    public blur(): void {

    let val: any = this.model.control.value;

    // Value needs to be combined as a string
    // tslint:disable-next-line
    val = val + '';
    if (val === '') {
      val = '0';
    }
    if (val.indexOf(',')) {
      val = val.replace(/,/g, '.');
    }

    // Emit worked aswell but I don't know what its doing in depth
    // this.ngModelChange.emit(parseFloat(val));

    const parsedFloat: number = parseFloat(val);
    if (Number.isNaN(parsedFloat)) {
      this.model.control.setValue('');
    } else {
      this.model.control.setValue(parsedFloat);
    }


    }
}
