import { Directive, HostListener, Input } from '@angular/core';
import { NgModel } from '@angular/forms';

@Directive({
  selector: '[ngModel][max-number-value]',
  standalone: false,
})
export class MaxNumberValueDirective {
  @Input('max-number-value') public value: string;
  constructor(private readonly model: NgModel) {}

  @HostListener('ionBlur')
  public blur(): void {
    let val: any = this.model.control.value;

    // Value needs to be combined as a string
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
    if (parsedFloat > parseFloat(this.value)) {
      this.model.control.setValue(0);
    } else {
      if (parsedFloat < 0) {
        this.model.control.setValue(0);
      } else {
        if (Number.isNaN(parsedFloat)) {
          this.model.control.setValue('');
        } else {
          this.model.control.setValue(parsedFloat);
        }
      }
    }
  }
}
