import {Component, Input, OnInit} from '@angular/core';

import {ModalController} from '@ionic/angular';
import {UIRoastingMachineStorage} from '../../../../services/uiRoastingMachineStorage';
import {RoastingMachine} from '../../../../classes/roasting-machine/roasting-machine';

@Component({
  selector: 'app-roasting-machine-modal-select',
  templateUrl: './roasting-machine-modal-select.component.html',
  styleUrls: ['./roasting-machine-modal-select.component.scss'],
})
export class RoastingMachineModalSelectComponent implements OnInit {
  public static COMPONENT_ID:string = 'roasting-machine-modal-select';
  public objs: Array<RoastingMachine> = [];
  public multipleSelection = {};
  public radioSelection: string;
  public segment: string = 'open';
  @Input() public multiple: boolean;
  @Input() private selectedValues: Array<string>;
  @Input() public showFinished: boolean;
  constructor(private readonly modalController: ModalController,
              private readonly uiRoastingMachineStorage: UIRoastingMachineStorage) {


  }

  public ionViewDidEnter(): void {
    this.objs = this.uiRoastingMachineStorage.getAllEntries();
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

  public getOpenEntries(): Array<RoastingMachine> {
    return this.objs.filter(
      (e) => !e.finished);
  }

  public getArchivedEntries(): Array<RoastingMachine> {
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
      const mill: RoastingMachine = this.uiRoastingMachineStorage.getByUUID(val);
      selected_text += mill.name + ', ';
    }

    selected_text = selected_text.substr(0, selected_text.lastIndexOf(', '));
    this.modalController.dismiss({
      selected_values: chosenKeys,
      selected_text: selected_text,
    },undefined,RoastingMachineModalSelectComponent.COMPONENT_ID);
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(undefined,undefined,RoastingMachineModalSelectComponent.COMPONENT_ID);
  }

}
