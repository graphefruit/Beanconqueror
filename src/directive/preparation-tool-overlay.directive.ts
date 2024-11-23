import {Directive, ElementRef, EventEmitter, HostListener, Input, Output} from '@angular/core';
import {NgModel} from '@angular/forms';
import {ModalController} from '@ionic/angular';
import {UIPreparationStorage} from '../services/uiPreparationStorage';
import {Preparation} from '../classes/preparation/preparation';
import {
  PreparationToolModalSelectComponent
} from '../app/preparation/preparation-tool-modal-select/preparation-tool-modal-select.component';

@Directive({
    selector: '[ngModel][preparation-tool-overlay]',
    standalone: false
})
export class PreparationToolOverlayDirective {

  @Output() public ngModelChange = new EventEmitter();
  @Input('multiple') public multipleSelect: boolean;
  @Input('show-finished') public showFinished: boolean = true;
  @Input('preparation-id') public preparationId: string = undefined;
  @Input('preparation-ids') public preparationIds: Array<string> = [];
  private oldModelValue: any = undefined;
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
    if (typeof (this.model.control.value) === 'string') {
      selectedValues.push(this.model.control.value);
    } else {

      if (this.model && this.model.control.value) {
        selectedValues = [...this.model.control.value];
      }
    }


    const modal = await this.modalController.create({
      component: PreparationToolModalSelectComponent,
      componentProps:
        {
          multiple: this.multipleSelect,
          selectedValues: selectedValues,
          showFinished: this.showFinished,
          preparationId: this.preparationId,
          preparationIds: this.preparationIds,
        },
      id: PreparationToolModalSelectComponent.COMPONENT_ID,
      showBackdrop: true
    });
    await modal.present();
    const {data} = await modal.onWillDismiss();

    if (data !== undefined) {
      if (this.multipleSelect) {
        this.model.control.setValue(data.selected_values);
        this.model.viewToModelUpdate(data.selected_values);
        this.ngModelChange.emit(data.selected_values);
        this.__generateOutputText(data.selected_values);
      } else {
        this.model.control.setValue(data.selected_values[0]);
        this.model.viewToModelUpdate(data.selected_values[0]);
        this.ngModelChange.emit(data.selected_values[0]);
        this.__generateOutputText(data.selected_values[0]);
      }
      _event.target.selectedText = data.selected_text;
    }


  }

  public ngDoCheck(): void {

    try {
      if (this.oldModelValue !== this.model.model){
        this.oldModelValue = this.model.model;
        this.__generateOutputText(this.model.model);
      }
    }
    catch (ex){

    }


  }


  private __generateOutputText(_uuid: string | Array<string>) {

    if (!_uuid) {
      return;
    }
    let generatedText: string = '';
    if (typeof (_uuid) === 'string') {
      generatedText = this.__getToolName(_uuid);

    } else {
      for (const uuid of _uuid) {
        generatedText += this.__getToolName(uuid) + ', ';
      }
      generatedText = generatedText.substr(0, generatedText.lastIndexOf(', '));
    }
    this.el.nativeElement.selectedText = generatedText;
  }


  private __getToolName(_uuid: string) {
    if (this.preparationId) {
      const preparation: Preparation = this.uiPreparationStorage.getByUUID(this.preparationId);
      return preparation.tools.find((e)=>e.config.uuid === _uuid).name;
    } else {
      for (const id of this.preparationIds) {
        const preparation: Preparation = this.uiPreparationStorage.getByUUID(id);
        const found = preparation.tools.find((e)=>e.config.uuid === _uuid)
        if (found) {
          return found.name;
        }
      }
    }
    return '';
  }


}
