import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Bean } from '../../../classes/bean/bean';
import { IBeanInformation } from '../../../interfaces/bean/iBeanInformation';
import { GreenBean } from '../../../classes/green-bean/green-bean';
import { BEAN_MIX_ENUM } from '../../../enums/beans/mix';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UIBeanHelper } from '../../../services/uiBeanHelper';

@Component({
  selector: 'bean-sort-information',
  templateUrl: './bean-sort-information.component.html',
  styleUrls: ['./bean-sort-information.component.scss'],
})
export class BeanSortInformationComponent implements OnInit {
  @Input() public data: Bean | GreenBean;
  @Output() public dataChange = new EventEmitter<Bean | GreenBean>();
  public settings: Settings = undefined;

  constructor(
    private readonly uiSettingsStorage: UISettingsStorage,
    public readonly uiBeanHelper: UIBeanHelper
  ) {}

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public addAnotherSort() {
    const beanInformation: IBeanInformation = {} as IBeanInformation;
    this.data.bean_information.push(beanInformation);
  }

  public deleteSortInformation(_index: number) {
    this.data.bean_information.splice(_index, 1);
  }
  public isBlend() {
    if (this.data instanceof Bean) {
      // #193
      return BEAN_MIX_ENUM[this.data.beanMix] === BEAN_MIX_ENUM.BLEND;
    }
    return false;
  }
}
