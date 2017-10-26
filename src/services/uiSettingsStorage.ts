/**Core**/
import {Injectable} from '@angular/core';
/**Ionic native**/
/**Classes**/
import {Settings} from '../classes/settings/settings';
/**Interfaces**/
import {ISettings} from '../interfaces/settings/iSettings';

/**Services**/
import {UIHelper} from '../services/uiHelper';
import {UILog} from '../services/uiLog';
import {UIStorage} from  '../services/uiStorage';
import {StorageClass} from  '../classes/storageClass';


@Injectable()
export class UISettingsStorage extends StorageClass {

  private settings: Settings = new Settings();

  constructor(protected uiStorage: UIStorage,
              protected uiHelper: UIHelper,
              protected uiLog: UILog) {
    super(uiStorage, uiHelper, uiLog, "SETTINGS");

    super.storageReady().then(() => {
      let entries: Array<any> = this.getAllEntries();
      if (entries.length > 0) {
        //We already had some settings here.
        this.settings.initializeByObject(entries[0]);
      }
      else {
        //Take the new settings obj.
        super.add(this.settings);
      }
    }, () => {
      //Outsch, cant do much.
    })
  }

  public getSettings(): Settings {
    return this.settings;
  }

  public saveSettings(settings: ISettings) {
      super.update(settings);
  }


}
