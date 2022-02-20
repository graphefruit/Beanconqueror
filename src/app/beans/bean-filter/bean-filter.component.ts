import { Component, OnInit } from '@angular/core';
import {Settings} from '../../../classes/settings/settings';
import {Preparation} from '../../../classes/preparation/preparation';
import {Bean} from '../../../classes/bean/bean';
import {Mill} from '../../../classes/mill/mill';
import {ModalController, NavParams} from '@ionic/angular';
import {UIBrewHelper} from '../../../services/uiBrewHelper';
import {UIHelper} from '../../../services/uiHelper';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {UIMillStorage} from '../../../services/uiMillStorage';
import {IBeanPageFilter} from '../../../interfaces/bean/iBeanPageFilter';

@Component({
  selector: 'app-bean-filter',
  templateUrl: './bean-filter.component.html',
  styleUrls: ['./bean-filter.component.scss'],
})
export class BeanFilterComponent implements OnInit {

  public static COMPONENT_ID = 'bean-filter';
  public settings: Settings;

  public filter: IBeanPageFilter;
  public method_of_preparations: Array<Preparation> = [];
  public beans: Array<Bean> = [];
  public mills: Array<Mill> = [];
  public segment: string = 'open';

  constructor(private readonly modalController: ModalController,
              private readonly uiBrewHelper: UIBrewHelper,
              private readonly navParams: NavParams,
              private readonly uiHelper: UIHelper,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiPreparationStorage: UIPreparationStorage,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiMillStorage: UIMillStorage) {

    this.settings = this.uiSettingsStorage.getSettings();
    this.filter = this.settings.GET_BEAN_FILTER();
  }

  public ngOnInit() {

    this.segment = this.navParams.get('segment');
    this.filter = this.uiHelper.copyData(this.navParams.get('bean_filter'));
    this.__reloadFilterSettings();
  }


  public dismiss(): void {
    this.modalController.dismiss({
      bean_filter: undefined
    });
  }

  public useFilter() {
    this.modalController.dismiss({
      bean_filter: this.uiHelper.copyData(this.filter)
    });
  }

  public resetFilter() {
    this.filter = this.settings.GET_BEAN_FILTER();
    this.modalController.dismiss({
      bean_filter: this.uiHelper.copyData(this.filter)
    },undefined,BeanFilterComponent.COMPONENT_ID);
  }


  private __reloadFilterSettings() {
    this.method_of_preparations = this.uiPreparationStorage.getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
    this.beans = this.uiBeanStorage.getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
    this.mills = this.uiMillStorage.getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));

    if (this.segment === 'open') {
      this.beans = this.beans.filter((e) => e.finished === false);
      this.mills = this.mills.filter((e) => e.finished === false);
      this.method_of_preparations = this.method_of_preparations.filter((e) => e.finished === false);
    } else {
      this.beans = this.beans.filter((e) => e.finished === true);
    }
  }

}
