/** Core */
import {Injectable} from '@angular/core';
import {Mill} from '../classes/mill/mill';
import {Brew} from '../classes/brew/brew';
import {Bean} from '../classes/bean/bean';
import {Preparation} from '../classes/preparation/preparation';
import {PREPARATION_STYLE_TYPE} from '../enums/preparations/preparationStyleTypes';
import {Settings} from '../classes/settings/settings';
import {UIBrewStorage} from './uiBrewStorage';
import {UIMillStorage} from './uiMillStorage';
import {UIBeanStorage} from './uiBeanStorage';
import {UIPreparationStorage} from './uiPreparationStorage';
import {UISettingsStorage} from './uiSettingsStorage';
import {UILog} from './uiLog';
import {UiVersionStorage} from './uiVersionStorage';
import {Version} from '../classes/version/iVersion';
import {AppVersion} from '@ionic-native/app-version/ngx';
import {Platform} from '@ionic/angular';


@Injectable({
  providedIn: 'root'
})
export class UIUpdate {

  constructor(private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiMillStorage: UIMillStorage,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiPreparationStorage: UIPreparationStorage,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiLog: UILog,
              private readonly uiVersionStorage: UiVersionStorage,
              private readonly appVersion: AppVersion,
              private readonly platform: Platform) {
  }


  public checkUpdate(): void {
    this.uiLog.info('Check updates');
    if (this.uiBrewStorage.getAllEntries().length > 0 && this.uiMillStorage.getAllEntries().length <= 0) {
      // We got an update and we got no mills yet, therefore we add a Standard mill.
      const data: Mill = new Mill();
      data.name = 'Standard';
      this.uiMillStorage.add(data);

      const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
      for (const brew of brews) {
        brew.mill = data.config.uuid;

        this.uiBrewStorage.update(brew);
      }
    }
    // We made an update, filePath just could storage one image, but we want to storage multiple ones.
    if (this.uiBeanStorage.getAllEntries().length > 0) {
      const beans: Array<Bean> = this.uiBeanStorage.getAllEntries();
      let needsUpdate: boolean = false;
      for (const bean of beans) {
        if (bean.filePath !== undefined && bean.filePath !== null && bean.filePath !== '') {
          bean.attachments.push(bean.filePath);
          bean.filePath = '';
          needsUpdate = true;
        }
        if (bean.fixDataTypes() || needsUpdate) {
          this.uiBeanStorage.update(bean);
        }

      }

    }
    if (this.uiPreparationStorage.getAllEntries().length > 0) {
      const preparations: Array<Preparation> = this.uiPreparationStorage.getAllEntries();
      let needsUpdate: boolean = false;
      for (const preparation of preparations) {
        if (preparation.style_type === undefined) {
          preparation.style_type = preparation.getPresetStyleType();
          needsUpdate = true;
        }
        if ( needsUpdate) {
          const preparationBrews: Array<Brew> = this.uiBrewStorage.getAllEntries()
            .filter((e) => e.method_of_preparation === preparation.config.uuid);
          if (preparation.style_type === PREPARATION_STYLE_TYPE.ESPRESSO){
            for (const brew of preparationBrews) {
              if (brew.brew_beverage_quantity === 0 && brew.brew_quantity > 0) {
                brew.brew_beverage_quantity = brew.brew_quantity;
                brew.brew_beverage_quantity_type = brew.brew_quantity_type;
                this.uiBrewStorage.update(brew);
              }

            }
          }
          this.uiPreparationStorage.update(preparation);
        }
      }
    }
    // Fix wrong types
    if (this.uiBrewStorage.getAllEntries().length > 0) {
      const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
      for (const brew of brews) {
        if (brew.fixDataTypes()) {
          this.uiBrewStorage.update(brew);
        }

      }
    }
    const settings: Settings = this.uiSettingsStorage.getSettings();
    if (settings.brew_order.after.tds === null || settings.brew_order.after.tds === undefined) {
      const newSettingsObj: Settings = new Settings();
      settings.brew_order.after.tds = newSettingsObj.brew_order.after.tds;
      this.uiSettingsStorage.saveSettings(settings);

    }
    if (settings.brew_order.after.brew_beverage_quantity === null || settings.brew_order.after.brew_beverage_quantity === undefined) {
      const newSettingsObj: Settings = new Settings();
      settings.brew_order.after.brew_beverage_quantity = newSettingsObj.brew_order.after.brew_beverage_quantity;
      this.uiSettingsStorage.saveSettings(settings);

    }
  }

  public async checkUpdateScreen(): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      let versionCode: string;
      if (this.platform.is('cordova')) {
        versionCode = await this.appVersion.getVersionNumber();
      } else {
        versionCode = '4.1.0';
      }
      const version: Version = this.uiVersionStorage.getVersion();
      const displayingVersions = await version.whichUpdateScreensShallBeDisplayed(versionCode);


      console.log(displayingVersions);
      version.pushUpdatedVersion('4.1.2');
      this.uiVersionStorage.saveVersion(version);
      resolve();

    });
    return promise;
  }
}
