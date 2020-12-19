import {Component, Input, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {Bean} from '../../../classes/bean/bean';

@Component({
  selector: 'bean-modal-select',
  templateUrl: './bean-modal-select.component.html',
  styleUrls: ['./bean-modal-select.component.scss'],
})
export class BeanModalSelectComponent implements OnInit {

  public bean_segment: string = 'open';
  public objs: Array<Bean> = [];
  public multipleSelection = {};
  public radioSelection: string;
  @Input() public multiple: boolean;
  @Input() public showFinished: boolean;
  @Input() private selectedValues: Array<string>;

  constructor(private readonly modalController: ModalController,
              private readonly uiBeanStorage: UIBeanStorage) {


    this.objs = this.uiBeanStorage.getAllEntries();

  }

  public ionViewDidEnter(): void {
    if (this.multiple) {
      for (const obj of this.objs) {

        this.multipleSelection[obj.config.uuid] = this.selectedValues.filter((e) => e === obj.config.uuid).length > 0;
      }
    } else {
      if (this.selectedValues.length > 0) {
        this.radioSelection = this.selectedValues[0];
      }
    }
  }

  public ngOnInit() {

  }

  public getOpenBeans(): Array<Bean> {

    return this.objs.filter(
      (e) => !e.finished);
  }

  public getFinishedBeans(): Array<Bean> {

    return this.objs.filter(
      (e) => e.finished);
  }


  public async choose(): Promise<void> {
    const chosenKeys: Array<string> = [];
    if (this.multiple) {


      for (const key in this.multipleSelection) {
        if (this.multipleSelection[key] === true) {
          chosenKeys.push(key);
        }
      }
    } else {
      chosenKeys.push(this.radioSelection);
    }
    let selected_text: string = '';

    for (const val of chosenKeys) {
      const bean = this.uiBeanStorage.getByUUID(val);
      selected_text += bean.name + ', ';
    }

    selected_text = selected_text.substr(0, selected_text.lastIndexOf(', '));
    this.modalController.dismiss({
      selected_values: chosenKeys,
      selected_text: selected_text,
    },undefined,'bean-modal-select');
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(undefined,undefined,'bean-modal-select');
  }

}
