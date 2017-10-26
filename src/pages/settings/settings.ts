/**Core**/
import {Component} from '@angular/core';

/**Interfaces**/
import {ISettings} from '../../interfaces/settings/iSettings';
/**Enums**/
import {BREW_VIEW_ENUM} from '../../enums/settings/brewView';

/**Services**/
import {UISettingsStorage} from '../../services/uiSettingsStorage';
@Component({
  templateUrl: 'settings.html'
})
export class SettingsPage {

  settings:ISettings;

  public BREW_VIEWS = BREW_VIEW_ENUM;
  constructor(public uiSettingsStorage:UISettingsStorage) {
    this.settings = this.uiSettingsStorage.getSettings();


  }

  public saveSettings(_event:any){
    this.uiSettingsStorage.saveSettings(this.settings);
  }

}
