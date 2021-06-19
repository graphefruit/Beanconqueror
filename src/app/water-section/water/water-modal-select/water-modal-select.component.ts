import {Component, Input, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {UIWaterStorage} from '../../../../services/uiWaterStorage';
import {Water} from '../../../../classes/water/water';

@Component({
  selector: 'app-water-modal-select',
  templateUrl: './water-modal-select.component.html',
  styleUrls: ['./water-modal-select.component.scss'],
})
export class WaterModalSelectComponent implements OnInit {
  public static COMPONENT_ID = 'water-model-select';

  public segment: string = 'open';
  public objs: Array<Water> = [];
  public multipleSelection = {};
  public radioSelection: string;
  @Input() public multiple: boolean;
  @Input() public showFinished: boolean;
  @Input() private selectedValues: Array<string>;

  constructor(private readonly modalController: ModalController,
              private readonly uiWaterStorage: UIWaterStorage) {


    this.objs = this.uiWaterStorage.getAllEntries();

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

  public getOpen(): Array<Water> {

    return this.objs.filter(
      (e) => !e.finished);
  }

  public getFinished(): Array<Water> {

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
      const water = this.uiWaterStorage.getByUUID(val);
      selected_text += water.name + ', ';
    }

    selected_text = selected_text.substr(0, selected_text.lastIndexOf(', '));
    this.modalController.dismiss({
      selected_values: chosenKeys,
      selected_text: selected_text,
    },undefined,WaterModalSelectComponent.COMPONENT_ID);
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(undefined,undefined,WaterModalSelectComponent.COMPONENT_ID);
  }

}
