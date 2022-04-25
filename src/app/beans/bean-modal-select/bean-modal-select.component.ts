import {Component, Input, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {Bean} from '../../../classes/bean/bean';
import {Brew} from '../../../classes/brew/brew';
import {UIBeanHelper} from '../../../services/uiBeanHelper';
import {BEAN_ROASTING_TYPE_ENUM} from '../../../enums/beans/beanRoastingType';

@Component({
  selector: 'bean-modal-select',
  templateUrl: './bean-modal-select.component.html',
  styleUrls: ['./bean-modal-select.component.scss'],
})
export class BeanModalSelectComponent implements OnInit {
  public static COMPONENT_ID = 'bean-modal-select';
  public bean_segment: string = 'open';
  public objs: Array<Bean> = [];
  public multipleSelection = {};
  public radioSelection: string;
  @Input() public multiple: boolean;
  @Input() public showFinished: boolean;
  @Input() private selectedValues: Array<string>;
  public beanRoastingTypeEnum = BEAN_ROASTING_TYPE_ENUM;

  constructor(private readonly modalController: ModalController,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiBeanHelper: UIBeanHelper) {


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

  public getUsedWeightCount(_bean: Bean): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(_bean.config.uuid);
    for (const brew of relatedBrews) {
      if (brew.bean_weight_in > 0) {
        usedWeightCount += brew.bean_weight_in;
      } else {
        usedWeightCount += brew.grind_weight;
      }
    }
    return usedWeightCount;
  }

  public ngOnInit() {

  }

  public getOpenBeans(): Array<Bean> {

    return this.objs.filter(
      (e) => !e.finished).sort( (a,b) => {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();

        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        return 0;
      }
    );
  }

  public getFinishedBeans(): Array<Bean> {

    return this.objs.filter(
      (e) => e.finished).sort( (a,b) => {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();

        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        return 0;
      }
    );
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
    },undefined, BeanModalSelectComponent.COMPONENT_ID);
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(undefined,undefined,BeanModalSelectComponent.COMPONENT_ID);
  }
  public isBeanRoastUnknown(_bean: Bean) {
    if (_bean) {
      return _bean.bean_roasting_type === 'UNKNOWN' as BEAN_ROASTING_TYPE_ENUM;
    }
    return true;
  }
}
