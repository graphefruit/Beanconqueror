/** Core */
import {Directive} from '@angular/core';
import {NgModel} from '@angular/forms';

@Directive({
  selector: '[ngModel][remove-empty-number]',
  providers: [NgModel],
  host: {
    "(ionFocus)": 'focus()'
  }
})
export class RemoveEmptyNumberDirective {


  //@Output() ngModelChange:EventEmitter<any> = new EventEmitter();

  constructor(private model: NgModel) {

  }



  focus(){

    let val: any = this.model.control.value;
    //Emit worked aswell but I don't know what its doing in depth
    //this.ngModelChange.emit(parseFloat(val));

    if (val === null || val === undefined || val === 0)
    {
      this.model.control.setValue("");

    }


  }
}
