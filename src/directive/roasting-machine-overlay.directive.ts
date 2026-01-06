import { Directive, ElementRef, HostListener, Input } from '@angular/core';
import { NgModel } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { UIRoastingMachineStorage } from '../services/uiRoastingMachineStorage';
import { RoastingMachine } from '../classes/roasting-machine/roasting-machine';
import { RoastingMachineModalSelectComponent } from '../app/roasting-section/roasting-machine/roasting-machine-modal-select/roasting-machine-modal-select.component';

@Directive({ selector: '[ngModel][roasting-machine-overlay]' })
export class RoastingMachineOverlayDirective {
  private oldModelValue: any = undefined;
  @Input('multiple') public multipleSelect: boolean;
  @Input('show-finished') public showFinished: boolean = true;

  constructor(
    private readonly model: NgModel,
    private readonly modalController: ModalController,
    private el: ElementRef,
    private uiRoastingMachineStorage: UIRoastingMachineStorage,
  ) {}

  @HostListener('click', ['$event', '$event.target'])
  public async click(_event, _target) {
    _event.cancelBubble = true;
    _event.preventDefault();
    _event.stopImmediatePropagation();
    _event.stopPropagation();

    let selectedValues: Array<string> = [];
    if (typeof this.model.control.value === 'string') {
      selectedValues.push(this.model.control.value);
    } else {
      if (this.model && this.model.control.value) {
        selectedValues = [...this.model.control.value];
      }
    }
    const modal = await this.modalController.create({
      component: RoastingMachineModalSelectComponent,
      componentProps: {
        multiple: this.multipleSelect,
        selectedValues: selectedValues,
        showFinished: this.showFinished,
      },
      id: RoastingMachineModalSelectComponent.COMPONENT_ID,
      showBackdrop: true,
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
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

  public ngDoCheck(): void {
    try {
      if (this.oldModelValue !== this.model.model) {
        this.oldModelValue = this.model.model;
        this.__generateOutputText(this.model.model);
      }
    } catch (ex) {}
  }

  private __generateOutputText(_uuid: string | Array<string>) {
    if (!_uuid) {
      return;
    }
    let generatedText: string = '';
    if (typeof _uuid === 'string') {
      const obj: RoastingMachine =
        this.uiRoastingMachineStorage.getByUUID(_uuid);
      generatedText = this.__generateTextByObj(obj);
    } else {
      for (const uuid of _uuid) {
        const obj: RoastingMachine =
          this.uiRoastingMachineStorage.getByUUID(uuid);
        generatedText += this.__generateTextByObj(obj) + ', ';
      }
      generatedText = generatedText.substr(0, generatedText.lastIndexOf(', '));
    }
    this.el.nativeElement.selectedText = generatedText;
  }

  private __generateTextByObj(_obj: RoastingMachine): string {
    const generatedText: string = `${_obj.name}`;
    return generatedText;
  }
}
