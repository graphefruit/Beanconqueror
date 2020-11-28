import {Component, Input, OnInit} from '@angular/core';

import {ModalController} from '@ionic/angular';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {Preparation} from '../../../classes/preparation/preparation';


@Component({
  selector: 'preparation-modal-select',
  templateUrl: './preparation-modal-select.component.html',
  styleUrls: ['./preparation-modal-select.component.scss'],
})
export class PreparationModalSelectComponent implements OnInit {


  public objs: Array<Preparation> = [];
  public multipleSelection = {};
  public radioSelection: string;
  public preparation_segment: string = 'open';
  @Input() public multiple: boolean;
  @Input() private selectedValues: Array<string>;
  @Input() public showFinished: boolean;
  constructor(private readonly modalController: ModalController,
              private readonly uiPreparationStorage: UIPreparationStorage) {


    this.objs = this.uiPreparationStorage.getAllEntries();

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

  public getOpenPreparations(): Array<Preparation> {
    return this.objs.filter(
      (e) => !e.finished);
  }

  public getArchivedPreparations(): Array<Preparation> {
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
      const preparation: Preparation = this.uiPreparationStorage.getByUUID(val);
      selected_text += preparation.name + ', ';
    }

    selected_text = selected_text.substr(0, selected_text.lastIndexOf(', '));
    this.modalController.dismiss({
      selected_values: chosenKeys,
      selected_text: selected_text,
    },undefined,'preparation-modal-select');
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(undefined, undefined, 'preparation-modal-select');
  }

}
