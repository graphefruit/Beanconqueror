import {Component, OnInit} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {UIBrewHelper} from '../../../services/uiBrewHelper';
import {UIHelper} from '../../../services/uiHelper';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {ISettings} from '../../../interfaces/settings/iSettings';
import {IBrewPageFilter} from '../../../interfaces/brew/iBrewPageFilter';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {UIMillStorage} from '../../../services/uiMillStorage';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {Bean} from '../../../classes/bean/bean';
import {Mill} from '../../../classes/mill/mill';
import {Preparation} from '../../../classes/preparation/preparation';

@Component({
  selector: 'brew-filter',
  templateUrl: './brew-filter.component.html',
  styleUrls: ['./brew-filter.component.scss'],
})
export class BrewFilterComponent implements OnInit {

  public settings: ISettings;

  public filter: IBrewPageFilter = {
    mill: [],
    bean: [],
    method_of_preparation: []
  };
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
  }

  public ngOnInit() {

    this.segment = this.navParams.get('segment');
    this.filter = this.uiHelper.copyData(this.navParams.get('brew_filter'));
    this.__reloadFilterSettings();
  }

  public dismiss(): void {
    this.modalController.dismiss({
      brew_filter: undefined
    });
  }

  public useFilter() {
    this.modalController.dismiss({
      brew_filter: this.uiHelper.copyData(this.filter)
    });
  }

  public resetFilter() {
    this.filter = {
      mill: [],
      bean: [],
      method_of_preparation: []
    };
    this.modalController.dismiss({
      brew_filter: this.uiHelper.copyData(this.filter)
    },undefined,'brew-filter');
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
