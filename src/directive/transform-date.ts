import {Directive, ElementRef, HostListener, Input} from '@angular/core';
import {NgModel} from '@angular/forms';

import {ModalController} from '@ionic/angular';
import {UIBeanStorage} from '../services/uiBeanStorage';

import moment from 'moment';

@Directive({
    // tslint:disable-next-line:directive-selector
    selector: '[ngModel][transform-date]',
})
export class TransformDateDirective {

  private oldModelValue: any = undefined;

  @Input('displayFormat') public displayFormat: string;

  constructor(private readonly model: NgModel,
              private readonly modalController: ModalController,
              private el: ElementRef,
              private uiBeanStorage: UIBeanStorage) {


  }




  public ngDoCheck(): void {
    try {
      if (this.oldModelValue !== this.model.model){
        this.oldModelValue = this.model.model;
        setTimeout(() => {
          this.__generateOutputText(this.model.model);
        },250);

      }
    }
    catch (ex){

    }


  }

  private __generateOutputText(_val) {

    const _date = moment(_val);
    if (_date.isValid()) {
      const _transformedDate = _date.format(this.displayFormat);
     // this.el.nativeElement.innerText =_transformedDate;
      this.el.nativeElement.getElementsByTagName('input')[0].value = _transformedDate;
    } else {

      this.el.nativeElement.getElementsByTagName('input')[0].value = '';

    }


  }


}
