import {Component, Input, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {UIMillStorage} from '../../../services/uiMillStorage';
import {Mill} from '../../../classes/mill/mill';

@Component({
  selector: 'mill-modal-select',
  templateUrl: './mill-modal-select.component.html',
  styleUrls: ['./mill-modal-select.component.scss'],
})
export class MillModalSelectComponent implements OnInit {

  public objs: Array<Mill> = [];
  public multipleSelection = {};
  public radioSelection: string;
  public mill_segment: string = 'open';
  @Input() public multiple: boolean;
  @Input() private selectedValues: Array<string>;
  @Input() public showFinished: boolean;
  constructor(private readonly modalController: ModalController,
              private readonly uiMillStorage: UIMillStorage) {


  }

  public ionViewDidEnter(): void {
    this.objs = this.uiMillStorage.getAllEntries();
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

  public getOpenMills(): Array<Mill> {
    return this.objs.filter(
      (e) => !e.finished);
  }

  public getArchivedMills(): Array<Mill> {
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
      const mill: Mill = this.uiMillStorage.getByUUID(val);
      selected_text += mill.name + ', ';
    }

    selected_text = selected_text.substr(0, selected_text.lastIndexOf(', '));
    this.modalController.dismiss({
      selected_values: chosenKeys,
      selected_text: selected_text,
    },undefined,'mill-modal-select');
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(undefined,undefined,'mill-modal-select');
  }

}
