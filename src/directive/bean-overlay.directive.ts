import {Directive, HostListener, Input} from '@angular/core';
import {NgModel} from '@angular/forms';
import {ModalController} from '@ionic/angular';
import {UIBeanStorage} from '../services/uiBeanStorage';
import {BeanModalSelectComponent} from '../app/beans/bean-modal-select/bean-modal-select.component';

@Directive({
  selector: '[ngModel][bean-overlay]',
  providers: [NgModel],
})
export class BeanOverlayDirective {


  @Input('multiple') public multipleSelect: boolean;
  constructor(private readonly model: NgModel,
              private readonly modalController: ModalController,
              private readonly uiBeanStorage: UIBeanStorage) {

  }

  @HostListener('click', ['$event', '$event.target'])
  public async click(_event, _target) {

    _event.cancelBubble = true;
    _event.preventDefault();
    _event.stopImmediatePropagation();
    _event.stopPropagation();


    let selectedValues: Array<string> = [];
    if (typeof (this.model.model) === 'string') {
      selectedValues.push(this.model.model);
    } else {
      selectedValues = [...this.model.model];
    }
    const modal = await this.modalController.create({
      component: BeanModalSelectComponent,
      componentProps:
        {
          multiple: this.multipleSelect,
          selectedValues: selectedValues
        },
      showBackdrop: true
    });
    await modal.present();
    const {data} = await modal.onWillDismiss();

    if (this.multipleSelect) {
      this.model.control.setValue(data.selected_values);
    } else {
      this.model.control.setValue(data.selected_values[0]);
    }


    _event.target.selectedText = data.selected_text;
    // const selectedBean: Bean = this.uiBeanStorage.getByUUID('39c6c119-c493-4a6d-9723-553ef9e1785d');



  }


}
