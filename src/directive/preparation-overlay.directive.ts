import {Directive, ElementRef, HostListener, Input} from '@angular/core';
import {NgModel} from '@angular/forms';
import {ModalController} from '@ionic/angular';
import {UIPreparationStorage} from '../services/uiPreparationStorage';
import {Preparation} from '../classes/preparation/preparation';
import {PreparationModalSelectComponent} from '../app/preparation/preparation-modal-select/preparation-modal-select.component';

@Directive({
  selector: '[ngModel][preparation-overlay]',
  providers: [NgModel],
})
export class PreparationOverlayDirective {


  @Input('multiple') public multipleSelect: boolean;
  @Input('show-finished') public showFinished: boolean = true;

  constructor(private readonly model: NgModel,
              private readonly modalController: ModalController,
              private el: ElementRef,
              private uiPreparationStorage: UIPreparationStorage) {


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
      component: PreparationModalSelectComponent,
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
      const preparation: Preparation = this.uiPreparationStorage.getByUUID(_uuid);
      generatedText = this.__generateTextByBean(preparation);
    } else {
      for (const uuid of _uuid) {
        const preparation: Preparation = this.uiPreparationStorage.getByUUID(uuid);
        generatedText += this.__generateTextByBean(preparation) + ', ';
      }
      generatedText = generatedText.substr(0, generatedText.lastIndexOf(', '));
    }
    this.el.nativeElement.selectedText = generatedText;
  }

  private __generateTextByBean(_preparation: Preparation): string {
    const generatedText: string = `${_preparation.name}`;
    return generatedText;
  }


}
