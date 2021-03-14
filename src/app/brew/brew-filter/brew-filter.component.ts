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
import {Settings} from '../../../classes/settings/settings';
import {PreparationTool} from '../../../classes/preparation/preparationTool';

@Component({
  selector: 'brew-filter',
  templateUrl: './brew-filter.component.html',
  styleUrls: ['./brew-filter.component.scss'],
})
export class BrewFilterComponent implements OnInit {

  public settings: ISettings;

  public filter: IBrewPageFilter = Settings.GET_BREW_FILTER();
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

  public hasPreparationTools() {
    for (const uuid of this.filter.method_of_preparation) {

      const preparation = this.uiPreparationStorage.getByUUID(uuid);
      if (preparation.tools.length > 0) {
        return true;
      }

    }
    return false;
  }

  public resetPreparationTools() {
    this.filter.method_of_preparation_tools = [];
  }

  public getPreparationTools() {
    const preparationTools: { name: string, tool: PreparationTool }[] = [];
    for (const uuid of this.filter.method_of_preparation) {

      const preparation:Preparation = this.uiPreparationStorage.getByUUID(uuid);
      if (preparation.tools.length > 0) {
        for (const tool of preparation.tools) {
          preparationTools.push({
            name:preparation.name,
            tool: tool
          })
        }

      }

    }
    return preparationTools;
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
    this.filter = Settings.GET_BREW_FILTER();
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
