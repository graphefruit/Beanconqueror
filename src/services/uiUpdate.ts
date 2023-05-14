/** Core */
import { Injectable } from '@angular/core';
import { Mill } from '../classes/mill/mill';
import { Brew } from '../classes/brew/brew';
import { Bean } from '../classes/bean/bean';
import { Preparation } from '../classes/preparation/preparation';
import { PREPARATION_STYLE_TYPE } from '../enums/preparations/preparationStyleTypes';
import { Settings } from '../classes/settings/settings';
import { UIBrewStorage } from './uiBrewStorage';
import { UIMillStorage } from './uiMillStorage';
import { UIBeanStorage } from './uiBeanStorage';
import { UIPreparationStorage } from './uiPreparationStorage';
import { UISettingsStorage } from './uiSettingsStorage';
import { UILog } from './uiLog';
import { UiVersionStorage } from './uiVersionStorage';
import { Version } from '../classes/version/iVersion';
import { AppVersion } from '@ionic-native/app-version/ngx';
import { ModalController, Platform } from '@ionic/angular';
import { UpdatePopoverComponent } from '../popover/update-popover/update-popover.component';
import { IBeanInformation } from '../interfaces/bean/iBeanInformation';
import { UIFileHelper } from './uiFileHelper';
import { File } from '@ionic-native/file/ngx';
import { UIAlert } from './uiAlert';
import { TranslateService } from '@ngx-translate/core';
import { UIStorage } from './uiStorage';
import { maxBy, keys } from 'lodash';
import { UIHelper } from './uiHelper';
import { RepeatBrewParameter } from '../classes/parameter/repeatBrewParameter';

@Injectable({
  providedIn: 'root',
})
export class UIUpdate {
  constructor(
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiMillStorage: UIMillStorage,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiLog: UILog,
    private readonly uiVersionStorage: UiVersionStorage,
    private readonly appVersion: AppVersion,
    private readonly platform: Platform,
    private readonly modalCtrl: ModalController,
    private readonly uiFileHelper: UIFileHelper,
    private readonly file: File,
    private readonly uiAlert: UIAlert,
    private readonly translate: TranslateService,
    private readonly uiStorage: UIStorage,
    private readonly uiHelper: UIHelper
  ) {}

  public async checkUpdate() {
    this.uiLog.info('Check updates');
    const hasData: boolean = await this.uiStorage.hasData();
    await this.__checkUpdateForDataVersion('UPDATE_1', !hasData);
    await this.__checkUpdateForDataVersion('UPDATE_2', !hasData);
    await this.__checkUpdateForDataVersion('UPDATE_3', !hasData);
    await this.__checkUpdateForDataVersion('UPDATE_4', !hasData);
    await this.__checkUpdateForDataVersion('UPDATE_5', !hasData);
    await this.__checkUpdateForDataVersion('UPDATE_6', !hasData);
    await this.__checkUpdateForDataVersion('UPDATE_7', !hasData);
    await this.__checkUpdateForDataVersion('UPDATE_8', !hasData);
    await this.__checkUpdateForDataVersion('UPDATE_9', !hasData);
  }

  private async __updateDataVersion(_version): Promise<boolean> {
    const promise: Promise<boolean> = new Promise(async (resolve, reject) => {
      try {
        switch (_version) {
          case 'UPDATE_1':
            if (
              this.uiBrewStorage.getAllEntries().length > 0 &&
              this.uiMillStorage.getAllEntries().length <= 0
            ) {
              // We got an update and we got no mills yet, therefore we add a Standard mill.
              const data: Mill = new Mill();
              data.name = 'Standard';
              await this.uiMillStorage.add(data);

              const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
              for (const brew of brews) {
                brew.mill = data.config.uuid;
                await this.uiBrewStorage.update(brew);
              }
            }
            // We made an update, filePath just could storage one image, but we want to storage multiple ones.
            if (this.uiBeanStorage.getAllEntries().length > 0) {
              const beans: Array<any> = this.uiBeanStorage.getAllEntries();
              let needsUpdate: boolean = false;
              for (const bean of beans) {
                if (
                  bean.filePath !== undefined &&
                  bean.filePath !== null &&
                  bean.filePath !== ''
                ) {
                  bean.attachments.push(bean.filePath);
                  delete bean.filePath;
                  needsUpdate = true;
                } else if (
                  bean.filePath !== undefined &&
                  bean.filePath !== null &&
                  bean.filePath === ''
                ) {
                  delete bean.filePath;
                  needsUpdate = true;
                }
                const beanInformation: IBeanInformation =
                  {} as IBeanInformation;
                if (
                  bean.variety ||
                  bean.country ||
                  (bean.processing && bean.bean_information.length <= 0)
                ) {
                  beanInformation.country = bean.country;
                  beanInformation.variety = bean.variety;
                  beanInformation.processing = bean.processing;

                  bean.bean_information.push(beanInformation);
                  needsUpdate = true;
                }
                if (
                  'variety' in bean ||
                  'country' in bean ||
                  'processing' in bean
                ) {
                  delete bean.country;
                  delete bean.variety;
                  delete bean.processing;
                  needsUpdate = true;
                }
                if (bean.bean_information.length <= 0) {
                  // Add empty one.
                  bean.bean_information.push(beanInformation);
                  needsUpdate = true;
                }
                if (bean.fixDataTypes() || needsUpdate) {
                  await this.uiBeanStorage.update(bean);
                }
              }
            }

            if (this.uiPreparationStorage.getAllEntries().length > 0) {
              const preparations: Array<any> =
                this.uiPreparationStorage.getAllEntries();
              let needsUpdate: boolean = false;
              for (const preparation of preparations) {
                if (preparation.style_type === undefined) {
                  preparation.style_type = preparation.getPresetStyleType();
                  needsUpdate = true;
                }
                if (needsUpdate) {
                  const preparationBrews: Array<any> = this.uiBrewStorage
                    .getAllEntries()
                    .filter(
                      (e) => e.method_of_preparation === preparation.config.uuid
                    );
                  if (
                    preparation.style_type === PREPARATION_STYLE_TYPE.ESPRESSO
                  ) {
                    for (const brew of preparationBrews) {
                      if (
                        brew.brew_beverage_quantity === 0 &&
                        brew.brew_quantity > 0
                      ) {
                        brew.brew_beverage_quantity = brew.brew_quantity;
                        brew.brew_beverage_quantity_type =
                          brew.brew_quantity_type;
                        await this.uiBrewStorage.update(brew);
                      }
                    }
                  }
                  await this.uiPreparationStorage.update(preparation);
                }
              }
            }
            // Fix wrong types
            if (this.uiBrewStorage.getAllEntries().length > 0) {
              const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
              for (const brew of brews) {
                if (brew.fixDataTypes()) {
                  await this.uiBrewStorage.update(brew);
                }
              }
            }

            const settings: any = this.uiSettingsStorage.getSettings();
            if (
              settings.brew_order.after.tds === null ||
              settings.brew_order.after.tds === undefined
            ) {
              const settingsAfter = settings.brew_order.after;
              const maxKey = maxBy(
                keys(settingsAfter),
                (o) => settingsAfter[o]
              );
              const highestNumber = settingsAfter[maxKey];
              settings.brew_order.after.tds = highestNumber + 1;
              await this.uiSettingsStorage.saveSettings(settings);
            }
            if (
              settings.brew_order.after.brew_beverage_quantity === null ||
              settings.brew_order.after.brew_beverage_quantity === undefined
            ) {
              const settingsAfter = settings.brew_order.after;
              const maxKey = maxBy(
                keys(settingsAfter),
                (o) => settingsAfter[o]
              );
              const highestNumber = settingsAfter[maxKey];
              settings.brew_order.after.brew_beverage_quantity =
                highestNumber + 1;
              await this.uiSettingsStorage.saveSettings(settings);
            }

            if (
              settings.brew_order.before.method_of_preparation_tool === null ||
              settings.brew_order.before.method_of_preparation_tool ===
                undefined
            ) {
              const settingsBefore = settings.brew_order.before;
              const maxKey = maxBy(
                keys(settingsBefore),
                (o) => settingsBefore[o]
              );
              const highestNumber = settingsBefore[maxKey];
              settings.brew_order.before.method_of_preparation_tool =
                highestNumber + 1;

              settings.manage_parameters.brew_time = settings.brew_time;
              settings.manage_parameters.brew_temperature_time =
                settings.brew_temperature_time;
              settings.manage_parameters.grind_size = settings.grind_size;
              settings.manage_parameters.grind_weight = settings.grind_weight;
              settings.manage_parameters.mill = settings.mill;
              settings.manage_parameters.mill_speed = settings.mill_speed;
              settings.manage_parameters.mill_timer = settings.mill_timer;
              settings.manage_parameters.pressure_profile =
                settings.pressure_profile;
              // This will be fixed value
              settings.manage_parameters.method_of_preparation = true;
              settings.manage_parameters.bean_type = true;
              settings.manage_parameters.mill = true;

              settings.manage_parameters.brew_quantity = settings.brew_quantity;
              settings.manage_parameters.brew_temperature =
                settings.brew_temperature;
              settings.manage_parameters.note = settings.note;
              settings.manage_parameters.attachments = settings.attachments;
              settings.manage_parameters.rating = settings.rating;
              settings.manage_parameters.coffee_type = settings.coffee_type;
              settings.manage_parameters.coffee_concentration =
                settings.coffee_concentration;
              settings.manage_parameters.coffee_first_drip_time =
                settings.coffee_first_drip_time;
              settings.manage_parameters.coffee_blooming_time =
                settings.coffee_blooming_time;
              settings.manage_parameters.set_last_coffee_brew =
                settings.set_last_coffee_brew;
              settings.manage_parameters.set_custom_brew_time =
                settings.set_custom_brew_time;
              settings.manage_parameters.tds = settings.tds;
              settings.manage_parameters.brew_beverage_quantity =
                settings.brew_beverage_quantity;

              // This will be fixed value
              settings.default_last_coffee_parameters.method_of_preparation =
                true;

              // With this property there also came the change that we moved all parameters to manage_parameters
              await this.uiSettingsStorage.saveSettings(settings);
            }

            delete settings.brew_time;
            delete settings.brew_temperature_time;
            delete settings.grind_size;
            delete settings.grind_weight;
            delete settings.mill;
            delete settings.mill_speed;
            delete settings.mill_timer;
            delete settings.pressure_profile;
            delete settings.brew_quantity;
            delete settings.brew_temperature;
            delete settings.note;
            delete settings.attachments;
            delete settings.rating;
            delete settings.coffee_type;
            delete settings.coffee_concentration;
            delete settings.coffee_first_drip_time;
            delete settings.coffee_blooming_time;
            delete settings.set_last_coffee_brew;
            delete settings.set_custom_brew_time;
            delete settings.tds;
            delete settings.brew_beverage_quantity;

            await this.uiSettingsStorage.saveSettings(settings);

            break;
          case 'UPDATE_2':
            const settings_v2: Settings = this.uiSettingsStorage.getSettings();
            // Reset after we've set new brewfilter
            settings_v2.resetFilter();
            await this.uiSettingsStorage.saveSettings(settings_v2);
            break;
          case 'UPDATE_3':
            const settings_v3: any = this.uiSettingsStorage.getSettings();
            // Delete old analytics property
            delete settings_v3.analytics;
            await this.uiSettingsStorage.saveSettings(settings_v3);
            break;
          case 'UPDATE_4':
            if (this.platform.is('cordova') && this.platform.is('ios')) {
              // Greenbean and roasting machines just existing in this updated version then.
              const allEntries: Array<Brew | Mill | Preparation | Bean> = [
                ...this.uiBrewStorage.getAllEntries(),
                ...this.uiMillStorage.getAllEntries(),
                ...this.uiPreparationStorage.getAllEntries(),
                ...this.uiBeanStorage.getAllEntries(),
              ];

              if (allEntries.length > 0) {
                this.uiLog.log(
                  `${_version} - Check ${allEntries.length} entries`
                );
                let entryIndex: number = -1;
                for (const entry of allEntries) {
                  entryIndex++;
                  try {
                    this.uiLog.log(
                      `${_version} - Check entry ${entryIndex} of ${allEntries.length}`
                    );
                    let entryNeedsUpdate: boolean = false;
                    // tslint:disable-next-line
                    for (let i = 0; i < entry.attachments.length; i++) {
                      this.uiLog.log(`${_version} - Check attachments ${i}`);
                      // We don't have a real path here, just the name
                      let oldPath = entry.attachments[i];
                      if (oldPath.startsWith('/')) {
                        // Remove the first slash
                        oldPath = oldPath.substr(1);
                      }
                      this.uiLog.log(
                        `${_version} - Move file from ${this.file.dataDirectory} to ${this.file.syncedDataDirectory}; Name: ${oldPath}`
                      );
                      const newPath: string = await this.uiFileHelper.moveFile(
                        this.file.dataDirectory,
                        this.file.documentsDirectory,
                        oldPath,
                        oldPath
                      );

                      this.uiLog.log(
                        `${_version} Update path from ${oldPath} to ${newPath}`
                      );
                      entry.attachments[i] = newPath;
                      entryNeedsUpdate = true;
                    }

                    if (entryNeedsUpdate) {
                      this.uiLog.log(
                        `${_version} - Update entry ${entryIndex} of ${allEntries.length}`
                      );

                      this.uiAlert.setLoadingSpinnerMessage(
                        this.translate.instant('UPDATE_ENTRY_OF', {
                          index: entryIndex,
                          count: allEntries.length,
                        })
                      );

                      let storageToUpdate:
                        | UIBrewStorage
                        | UIBeanStorage
                        | UIPreparationStorage
                        | UIMillStorage;
                      if (entry instanceof Brew) {
                        storageToUpdate = this.uiBrewStorage;
                      } else if (entry instanceof Mill) {
                        storageToUpdate = this.uiMillStorage;
                      } else if (entry instanceof Preparation) {
                        storageToUpdate = this.uiPreparationStorage;
                      } else if (entry instanceof Bean) {
                        storageToUpdate = this.uiBeanStorage;
                      }
                      await storageToUpdate.update(entry);
                    }
                  } catch (ex) {
                    this.uiLog.log(
                      `${_version} - Update exception ${ex.message}`
                    );
                  }
                }
              }
            }
            break;
          case 'UPDATE_5':
            const settings_v5: any = this.uiSettingsStorage.getSettings();
            if (
              settings_v5.brew_order.before.water === null ||
              settings_v5.brew_order.before.water === undefined
            ) {
              const settings_v5Before = settings_v5.brew_order.before;
              const maxKey = maxBy(
                keys(settings_v5Before),
                (o) => settings_v5Before[o]
              );
              const highestNumber = settings_v5Before[maxKey];

              settings_v5.brew_order.before.water = highestNumber + 1;
              settings_v5.brew_order.before.bean_weight_in = highestNumber + 2;
              settings_v5.brew_order.before.vessel = highestNumber + 3;
              await this.uiSettingsStorage.saveSettings(settings_v5);

              const preparations_v5: any =
                this.uiPreparationStorage.getAllEntries();
              for (const prep of preparations_v5) {
                prep.brew_order.before.water = highestNumber + 1;
                prep.brew_order.before.bean_weight_in = highestNumber + 2;
                prep.brew_order.before.vessel = highestNumber + 3;
                await this.uiPreparationStorage.update(prep);
              }
            }
            break;
          case 'UPDATE_6':
            const beans_v6: any = this.uiBeanStorage.getAllEntries();
            for (const bean of beans_v6) {
              // We have issues with references, so we deep copy to remove them
              bean.bean_information = this.uiHelper.cloneData(
                bean.bean_information
              );
              await this.uiBeanStorage.update(bean);
            }

            const settings_v6: any = this.uiSettingsStorage.getSettings();
            // Delete old onces
            delete settings_v6.bean_filter;
            delete settings_v6.green_bean_filter;

            // Reset filter, because we got a new sort on beans
            settings_v6.resetFilter();
            await this.uiSettingsStorage.saveSettings(settings_v6);

            const preparations_v6: Array<Preparation> =
              this.uiPreparationStorage.getAllEntries();
            for (const prep_v6 of preparations_v6) {
              for (const tool of prep_v6.tools) {
                tool.archived = false;
              }
              await this.uiPreparationStorage.update(prep_v6);
            }

            break;
          case 'UPDATE_7':
            const settings_v7: any = this.uiSettingsStorage.getSettings();
            // Convert to number, after we've missed out
            settings_v7.brew_rating_steps = Number(
              settings_v7.brew_rating_steps
            );
            await this.uiSettingsStorage.saveSettings(settings_v7);

            break;
          case 'UPDATE_8':
            const settings_v8: any = this.uiSettingsStorage.getSettings();
            // Convert to number, after we've missed out
            if (
              settings_v8.brew_rating_steps === null ||
              settings_v8.brew_rating_steps === undefined
            ) {
              settings_v8.brew_rating_steps = 1;
            }
            if (
              settings_v8.bean_rating_steps === null ||
              settings_v8.bean_rating_steps === undefined
            ) {
              settings_v8.bean_rating_steps = 1;
            }
            // Reset matomo analytics to undefined, so we get another update
            settings_v8.matomo_analytics = undefined;
            await this.uiSettingsStorage.saveSettings(settings_v8);

            break;

          case 'UPDATE_9':
            // Already existing installation which has more then one bean.
            const settings_v9: Settings = this.uiSettingsStorage.getSettings();
            settings_v9.repeat_coffee_parameters = new RepeatBrewParameter();
            const beansListV9: Array<Bean> = this.uiBeanStorage.getAllEntries();
            if (beansListV9.length > 0) {
              this.uiLog.info(
                'Update 9 - We found more then zero beans, therefore its an existing instance, we need to update the beans, so the user will see all details again'
              );

              settings_v9.bean_manage_parameters.activateAll();
            }

            settings_v9.graph.FILTER.temperature = true;
            settings_v9.graph.ESPRESSO.temperature = true;

            // Reset filter, because we got a new sort on beans
            settings_v9.resetFilter();
            await this.uiSettingsStorage.saveSettings(settings_v9);
            const preparationListV9: Array<Preparation> =
              this.uiPreparationStorage.getAllEntries();
            for (const prep of preparationListV9) {
              prep.repeat_coffee_parameters = new RepeatBrewParameter();
              prep.repeat_coffee_parameters.repeat_coffee_active = false;
              prep.repeat_coffee_parameters.coffee_first_drip_time = false;
              prep.repeat_coffee_parameters.brew_beverage_quantity = false;
              prep.repeat_coffee_parameters.brew_quantity = false;
              await this.uiPreparationStorage.update(prep);
            }

            break;

          default:
            break;
        }
        resolve(true);
      } catch (ex) {
        this.uiLog.log('Update exception occured: ' + ex.message);
        resolve(false);
      }
    });
    return promise;
  }

  private async __checkUpdateForDataVersion(
    _dataVersion: string,
    _silentUpdate: boolean
  ) {
    const version: Version = this.uiVersionStorage.getVersion();
    let somethingUpdated: boolean = false;

    this.uiLog.info('Check updates');

    if (version.checkIfDataVersionWasUpdated(_dataVersion) === false) {
      if (!_silentUpdate) {
        await this.uiAlert.showLoadingSpinner();
      }

      this.uiLog.info('Data version ' + _dataVersion + ' - Update');
      try {
        const updated: boolean = await this.__updateDataVersion(_dataVersion);
        if (updated) {
          version.pushUpdatedDataVersion(_dataVersion);
          somethingUpdated = true;
        } else {
          this.uiLog.info(
            'Data version ' + _dataVersion + ' - could not update'
          );
        }
        if (!_silentUpdate) {
          await this.uiAlert.hideLoadingSpinner();
        }
      } catch (ex) {
        this.uiLog.error(
          'Data version ' + _dataVersion + ' - could not update ' + ex.message
        );
      }
    } else {
      this.uiLog.info('Data version ' + _dataVersion + ' - No Update');
    }

    if (somethingUpdated) {
      await this.uiVersionStorage.saveVersion(version);
    }
  }

  public async checkUpdateScreen(): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      let versionCode: string;
      if (this.platform.is('cordova')) {
        versionCode = await this.appVersion.getVersionNumber();
      } else {
        // Hardcored for testing
        versionCode = '6.4.0';
      }
      const version: Version = this.uiVersionStorage.getVersion();
      const displayingVersions =
        version.whichUpdateScreensShallBeDisplayed(versionCode);

      if (displayingVersions.length > 0) {
        await this.__showUpdateScreen(displayingVersions);

        for (const v of displayingVersions) {
          version.pushUpdatedVersion(v);
        }
        await this.uiVersionStorage.saveVersion(version);
      }

      resolve(undefined);
    });
    return promise;
  }

  private async __showUpdateScreen(showingVersions: Array<string>) {
    const modal = await this.modalCtrl.create({
      component: UpdatePopoverComponent,
      id: 'update-popover',
      showBackdrop: true,
      backdropDismiss: true,
      swipeToClose: true,
      componentProps: { versions: showingVersions },
    });
    await modal.present();
    await modal.onWillDismiss();
  }
}
