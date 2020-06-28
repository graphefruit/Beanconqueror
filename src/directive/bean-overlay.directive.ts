import {Directive, ElementRef, HostListener, Input} from '@angular/core';
import {NgModel} from '@angular/forms';
import {ModalController} from '@ionic/angular';
import {BeanModalSelectComponent} from '../app/beans/bean-modal-select/bean-modal-select.component';
import {UIBeanStorage} from '../services/uiBeanStorage';
import {Bean} from '../classes/bean/bean';

@Directive({
  selector: '[ngModel][bean-overlay]',
  providers: [NgModel],
})
export class BeanOverlayDirective {


  @Input('multiple') public multipleSelect: boolean;
  @Input('show-finished') public showFinished: boolean = true;

  constructor(private readonly model: NgModel,
              private readonly modalController: ModalController,
              private el: ElementRef,
              private uiBeanStorage: UIBeanStorage) {


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
          selectedValues: selectedValues,
          showFinished: this.showFinished
        },
      showBackdrop: true
    });
    await modal.present();
    const {data} = await modal.onWillDismiss();
    if (data !== undefined) {
      if (this.multipleSelect) {
        this.model.control.setValue(data.selected_values);
        this.__generateOutputText(data.selected_values);
      } else {
        this.model.control.setValue(data.selected_values[0]);
        this.__generateOutputText(data.selected_values[0]);
      }


      _event.target.selectedText = data.selected_text;
    }


  }


  public ngAfterViewChecked() {
    this.__generateOutputText(this.model.model);
  }


  private __generateOutputText(_uuid: string | Array<string>) {

    let generatedText: string = '';
    if (typeof (_uuid) === 'string') {
      const bean: Bean = this.uiBeanStorage.getByUUID(_uuid);
      generatedText = this.__generateTextByBean(bean);
    } else {
      for (const uuid of _uuid) {
        const bean: Bean = this.uiBeanStorage.getByUUID(uuid);
        generatedText += this.__generateTextByBean(bean) + ', ';
      }
      generatedText = generatedText.substr(0, generatedText.lastIndexOf(', '));
    }
    this.el.nativeElement.selectedText = generatedText;
  }

  private __generateTextByBean(_bean: Bean): string {
    const generatedText: string = `${_bean.name}`;
    return generatedText;
  }



}
