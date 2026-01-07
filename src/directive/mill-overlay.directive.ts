import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  inject,
} from '@angular/core';
import { NgModel } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';
import { UIMillStorage } from '../services/uiMillStorage';
import { Mill } from '../classes/mill/mill';
import { MillModalSelectComponent } from '../app/mill/mill-modal-select/mill-modal-select.component';

@Directive({ selector: '[ngModel][mill-overlay]' })
export class MillOverlayDirective {
  private readonly model = inject(NgModel);
  private readonly modalController = inject(ModalController);
  private el = inject(ElementRef);
  private uiMillStorage = inject(UIMillStorage);

  private oldModelValue: any = undefined;
  @Input('multiple') public multipleSelect: boolean;
  @Input('show-finished') public showFinished: boolean = true;

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
      component: MillModalSelectComponent,
      componentProps: {
        multiple: this.multipleSelect,
        selectedValues: selectedValues,
        showFinished: this.showFinished,
      },
      id: MillModalSelectComponent.COMPONENT_ID,
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
      const obj: Mill = this.uiMillStorage.getByUUID(_uuid);
      generatedText = this.__generateTextByObj(obj);
    } else {
      for (const uuid of _uuid) {
        const obj: Mill = this.uiMillStorage.getByUUID(uuid);
        generatedText += this.__generateTextByObj(obj) + ', ';
      }
      generatedText = generatedText.substr(0, generatedText.lastIndexOf(', '));
    }
    this.el.nativeElement.selectedText = generatedText;
  }

  private __generateTextByObj(_obj: Mill): string {
    const generatedText: string = `${_obj.name}`;
    return generatedText;
  }
}
