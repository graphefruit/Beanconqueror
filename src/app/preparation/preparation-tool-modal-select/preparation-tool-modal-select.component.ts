import {Component, Input, OnInit} from '@angular/core';
import {Preparation} from '../../../classes/preparation/preparation';
import {ModalController} from '@ionic/angular';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';

@Component({
  selector: 'preparation-tool-modal-select',
  templateUrl: './preparation-tool-modal-select.component.html',
  styleUrls: ['./preparation-tool-modal-select.component.scss'],
})
export class PreparationToolModalSelectComponent implements OnInit {


  public static COMPONENT_ID = 'preparation-tool-modal-select';
  public objs: Array<Preparation> = [];
  public multipleSelection = {};
  public radioSelection: string;
  public preparation_segment: string = 'open';
  private data: Preparation = null;
  private datas: Array<Preparation> = [];
  @Input() public multiple: boolean;
  @Input() private selectedValues: Array<string>;
  @Input() public showFinished: boolean;
  @Input() private preparationId: string;
  @Input() private preparationIds: Array<string>;
  constructor(private readonly modalController: ModalController,
              private readonly uiPreparationStorage: UIPreparationStorage) {




  }

  public ionViewDidEnter(): void {
    if (this.preparationId) {
      this.data = this.uiPreparationStorage.getByUUID(this.preparationId);
      this.initializeSingleId();
    } else {
      for (const id of this.preparationIds) {
        this.datas.push(this.uiPreparationStorage.getByUUID(id));
      }
      this.initializeMultipleIds();

    }



  }

  public initializeSingleId() {
    if (this.multiple) {
      for (const obj of this.data.tools) {

        this.multipleSelection[obj.config.uuid] = this.selectedValues.filter((e) => e === obj.config.uuid).length > 0;
      }
    } else {
      if (this.selectedValues.length > 0) {
        this.radioSelection = this.selectedValues[0];
      }
    }
  }
  public initializeMultipleIds() {
    if (this.multiple) {

      const tools = [];
      for (const data of this.datas) {
        tools.push(...data.tools);
      }
      for (const obj of tools) {

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

  public getActivePreparationTools() {
    if (this.data) {
      return this.data.tools.filter((e)=>e.archived === false);
    } else {
      const tools = [];
      for (const data of this.datas) {
        tools.push(...data.tools.filter((e)=>e.archived===false));
      }
      return tools;
    }

  }

  public getChoosenPreparationToolsWhichAreArchived() {

    if (this.data) {
      const tools = this.data.tools.filter((e) => e.archived);
      return tools;
    } else {
      const tools = [];
      for (const data of this.datas) {
        tools.push(...data.tools.filter((e)=>e.archived===true));
      }
      return tools;
    }


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
      selected_text += this.getToolName(val) + ', ';
    }

    selected_text = selected_text.substr(0, selected_text.lastIndexOf(', '));
    this.modalController.dismiss({
      selected_values: chosenKeys,
      selected_text: selected_text,
    },undefined, PreparationToolModalSelectComponent.COMPONENT_ID);
  }

  private getToolName(_uuid: string) {
    if (this.data) {
      const preparation: Preparation = this.uiPreparationStorage.getByUUID(this.preparationId);
      return preparation.tools.find((e)=>e.config.uuid === _uuid).name;
    } else {
      const tools = [];
      for (const data of this.datas) {
        const found = data.tools.find((e)=>e.config.uuid === _uuid);
        if (found) {
          return found.name;
        }
      }
    }
    return '';
  }
  public async dismiss(): Promise<void> {
    this.modalController.dismiss(undefined, undefined, PreparationToolModalSelectComponent.COMPONENT_ID);
  }

}
