import { Directive, HostListener } from '@angular/core';
import { NgModel } from '@angular/forms';

@Directive({
  selector: '[ngModel][remove-empty-number]',
  standalone: false,
})
export class RemoveEmptyNumberDirective {
  // @Output() ngModelChange:EventEmitter<any> = new EventEmitter();

  constructor(private readonly model: NgModel) {}

  @HostListener('ionFocus')
  public focus(): void {
    const val: any = this.model.control.value;
    // Emit worked aswell but I don't know what its doing in depth
    // this.ngModelChange.emit(parseFloat(val));

    if (
      val === null ||
      val === undefined ||
      val === 0 ||
      val === '0' ||
      val === ''
    ) {
      this.model.control.setValue('');
    }
  }
}
