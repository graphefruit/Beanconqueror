import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {BREW_VIEW_ENUM} from '../../enums/settings/brewView';
import {IBean} from '../../interfaces/bean/iBean';
import {IBrew} from '../../interfaces/brew/iBrew';
import {AlertController, Platform} from '@ionic/angular';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {UIStorage} from '../../services/uiStorage';
import {UIHelper} from '../../services/uiHelper';
import {FileChooser} from '@ionic-native/file-chooser/ngx';
import {FilePath} from '@ionic-native/file-path/ngx';
import {UIAlert} from '../../services/uiAlert';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {UIMillStorage} from '../../services/uiMillStorage';
import {IOSFilePicker} from '@ionic-native/file-picker/ngx';
import {SocialSharing} from '@ionic-native/social-sharing/ngx';
import {FileEntry} from '@ionic-native/file';
import {File} from '@ionic-native/file/ngx';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {Brew} from '../../classes/brew/brew';
import {Mill} from '../../classes/mill/mill';
import {Settings} from '../../classes/settings/settings';
import {UILog} from '../../services/uiLog';
import {TranslateService} from '@ngx-translate/core';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';
import {Subject} from 'rxjs';
import {STARTUP_VIEW_ENUM} from '../../enums/settings/startupView';
import {UIAnalytics} from '../../services/uiAnalytics';

@Component({
  selector: 'settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  public settings: Settings;

  public BREW_VIEWS = BREW_VIEW_ENUM;
  public STARTUP_VIEW = STARTUP_VIEW_ENUM;
  public debounceLanguageFilter: Subject<string> = new Subject<string>();

  public settings_segment: string = 'general';

  public brewOrders: Array<{ number: number, label: string, enum: string }> = [];

  private static __cleanupImportBeanData(_data: Array<IBean>): any {
    if (_data !== undefined && _data.length > 0) {
      for (const bean of _data) {
        bean.filePath = '';
        bean.attachments = [];
      }
    }
  }

  private static __cleanupImportBrewData(_data: Array<IBrew>): void {
    if (_data !== undefined && _data.length > 0) {
      for (const brew of _data) {
        brew.attachments = [];
      }
    }
  }

  constructor(private readonly platform: Platform,
              public uiSettingsStorage: UISettingsStorage,
              public uiStorage: UIStorage,
              public uiHelper: UIHelper,
              private readonly fileChooser: FileChooser,
              private readonly filePath: FilePath,
              private readonly file: File,
              private readonly alertCtrl: AlertController,
              private readonly uiAlert: UIAlert,
              private readonly uiPreparationStorage: UIPreparationStorage,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiMillStorage: UIMillStorage,
              private readonly iosFilePicker: IOSFilePicker,
              private readonly socialSharing: SocialSharing,
              private readonly uiLog: UILog,
              private readonly translate: TranslateService,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly uiAnalytics: UIAnalytics) {
    this.__initializeSettings();
    this.debounceLanguageFilter
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(() => {
        this.setLanguage();
      });
  }

  public reorder_brew(ev: any) {

    this.uiAnalytics.trackEvent('SETTINGS', 'REORDER_BREW');
    // The `from` and `to` properties contain the index of the item
    // when the drag started and ended, respectively
    // console.log('Dragged from index', ev.detail.from, 'to', ev.detail.to);
    // console.log(this.brewOrders);
    this.brewOrders.splice(ev.detail.to, 0, this.brewOrders.splice(ev.detail.from, 1)[0]);
    let count: number = 0;
    for (const order of this.brewOrders) {
      order.number = count;
      this.settings.brew_order[order.enum] = order.number;
      count++;
    }
    // console.log(this.settings.brew_order);
    // Finish the reorder and position the item in the DOM based on
    // where the gesture ended. This method can also be called directly
    // by the reorder group
    ev.detail.complete();
    this.saveSettings();
  }



  public ngOnInit() {

  }

  public saveSettings(): void {
    this.changeDetectorRef.detectChanges();
    this.uiSettingsStorage.saveSettings(this.settings);
  }

  public checkAnalytics(): void {
    if (this.settings.analytics) {
      this.uiAnalytics.trackEvent('SETTINGS', 'TRACKING_ENABLE');
      this.uiAnalytics.enableTracking();
    } else {
      this.uiAnalytics.trackEvent('SETTINGS', 'TRACKING_DISABLE');
      // Last one here so, but we need to know, which users don't want any tracking.
      this.uiAnalytics.disableTracking();
    }
  }

  public languageChanged(_query): void {
    this.debounceLanguageFilter.next(_query);
  }

  public setLanguage(): void {
    this.translate.setDefaultLang(this.settings.language);
    this.translate.use(this.settings.language);
    this.uiAnalytics.trackEvent('SETTINGS', 'SET_LANGUAGE_ ' + this.settings.language);
    this.uiSettingsStorage.saveSettings(this.settings);
  }

  public import (): void {
    if (this.platform.is('cordova')) {
      this.uiAnalytics.trackEvent('SETTINGS', 'IMPORT');
      this.uiLog.log('Import real data');
      if (this.platform.is('android')) {
        this.fileChooser.open()
          .then((uri) => {
            if (uri && uri.endsWith('.json')) {
              this.filePath.resolveNativePath(uri).then((resolvedFilePath) => {
                const path = resolvedFilePath.substring(0, resolvedFilePath.lastIndexOf('/'));
                const file = resolvedFilePath.substring(resolvedFilePath.lastIndexOf('/') + 1, resolvedFilePath.length);
                this.__readJSONFile(path, file).then(() => {
                  // nothing todo
                }, (_err) => {
                  this.uiAlert.showMessage(this.translate.instant('ERROR_ON_FILE_READING') + ' (' + JSON.stringify(_err) + ')');
                });
              }).catch((_err) => {
                this.uiAlert.showMessage(this.translate.instant('FILE_NOT_FOUND_INFORMATION') + ' (' + JSON.stringify(_err) + ')');
              });
            } else {
              this.uiAlert.showMessage(this.translate.instant('INVALID_FILE_FORMAT'));
            }
          });
      } else {
        this.iosFilePicker.pickFile().then((uri) => {
          if (uri && uri.endsWith('.json')) {
            let path = uri.substring(0, uri.lastIndexOf('/'));
            const file = uri.substring(uri.lastIndexOf('/') + 1, uri.length);
            if (path.indexOf('file://') !== 0) {
              path = 'file://' + path;
            }
            this.__readJSONFile(path, file).then(() => {
              // nothing todo
            }).catch((_err) => {
              this.uiAlert.showMessage(this.translate.instant('FILE_NOT_FOUND_INFORMATION') + ' (' + JSON.stringify(_err) + ')');
            });
          } else {
            this.uiAlert.showMessage(this.translate.instant('INVALID_FILE_FORMAT'));
          }
        });

      }
    } else {
      this.__importDummyData();
    }
  }

  public isMobile (): boolean {
    return (this.platform.is('android') || this.platform.is('ios'));
  }


  public export(): void {
    this.uiAnalytics.trackEvent('SETTINGS', 'EXPORT');
    this.uiStorage.export().then((_data) => {
      this.uiHelper.exportJSON('Beanconqueror.json', JSON.stringify(_data)).then(async (_fileEntry: FileEntry) => {
        if (this.platform.is('android')) {
          const alert =  await this.alertCtrl.create({
            header: this.translate.instant('DOWNLOADED'),
            subHeader: this.translate.instant('FILE_DOWNLOADED_SUCCESSFULLY', {fileName: _fileEntry.name}),
            buttons: ['OK']
          });
          await alert.present();
        } else {
          this.socialSharing.share(undefined, undefined, _fileEntry.nativeURL);
        }

      });
    });

  }

  private __initializeBrewOrders() {
    this.brewOrders = [];
    for (const key in this.settings.brew_order) {
      if (this.settings.brew_order.hasOwnProperty(key)) {
        this.brewOrders.push({
          number: this.settings.brew_order[key],
          label: this.settings.brew_order.getLabel(key),
          enum: key,
        });
      }
    }
    this.brewOrders.sort((obj1, obj2) => {
      if (obj1.number > obj2.number) {
        return 1;
      }

      if (obj1.number < obj2.number) {
        return -1;
      }

      return 0;
    });
  }
  /* tslint:disable */
  private __importDummyData(): void {
    this.uiLog.log('Import dummy data');
    const t = {
      'BEANS': [{
        'name': '0 Winter ',
        'roastingDate': '2019-12-01T14:46:30.285+01:00',
        'note': '',
        'filePath': '',
        'roaster': 'Rösttrommel ',
        'config': {'uuid': '1373c76d-eb5a-43b4-9e75-c1ee4dd035b5', 'unix_timestamp': 1577454471},
        'roast': 'UNKNOWN',
        'roast_custom': '',
        'beanMix': 'BLEND',
        'variety': '',
        'country': '',
        'aromatics': 'Nach Weihnachten',
        'weight': 250,
        'finished': true,
        'cost': 0,
        'attachments': ['/beanconqueror_image1.png']
      }, {
        'name': 'Milano',
        'roastingDate': '2019-12-06T22:34:13.077+01:00',
        'note': '',
        'filePath': '',
        'roaster': 'Espressone ',
        'config': {'uuid': '57795dee-67aa-42c8-a9cb-2a2ee13d0467', 'unix_timestamp': 1577482503},
        'roast': 'UNKNOWN',
        'roast_custom': '',
        'beanMix': 'BLEND',
        'variety': '',
        'country': '',
        'aromatics': '',
        'weight': 1,
        'finished': false,
        'cost': 19,
        'attachments': ['/beanconqueror_image2.png']
      }, {
        'name': 'Weihnachts Kaffee',
        'roastingDate': '2019-12-10T23:08:57.809+01:00',
        'note': '',
        'filePath': '',
        'roaster': 'Machhörndl ',
        'config': {'uuid': 'f2f5e0b2-fffe-4570-9a07-ccaafedcf6f2', 'unix_timestamp': 1577484860},
        'roast': 'UNKNOWN',
        'roast_custom': '',
        'beanMix': 'BLEND',
        'variety': '',
        'country': 'Kolumbien (Arhuaco Tribe) + Peru (Kooperative Amoju)',
        'aromatics': 'Mandarine, getrocknete Feige, dunkle Schokolade ',
        'weight': 250,
        'finished': false,
        'cost': 0,
        'attachments': ['/beanconqueror_image3.png']
      }],
      'BREWS': [{
        'grind_size': '2',
        'grind_weight': 17,
        'method_of_preparation': 'd6ed9d9b-8228-44c6-afcb-9e982181796d',
        'mill': '83249ce6-1b57-484a-84f4-08d7b2470d4e',
        'mill_speed': 0,
        'mill_timer': 0,
        'pressure_profile': '',
        'bean': '1373c76d-eb5a-43b4-9e75-c1ee4dd035b5',
        'brew_temperature_time': 0,
        'brew_temperature': 92,
        'brew_time': 25,
        'brew_quantity': 0,
        'brew_quantity_type': 'GR',
        'note': '',
        'rating': 6,
        'coffee_type': '',
        'coffee_concentration': '',
        'coffee_first_drip_time': 0,
        'coffee_blooming_time': 0,
        'attachments': [],
        'config': {'uuid': '340f5c9c-dde2-45bd-be69-bae19b5a6dad', 'unix_timestamp': 1577454602}
      }, {
        'grind_size': '1,5',
        'grind_weight': 18.1,
        'method_of_preparation': 'd6ed9d9b-8228-44c6-afcb-9e982181796d',
        'mill': '83249ce6-1b57-484a-84f4-08d7b2470d4e',
        'mill_speed': 0,
        'mill_timer': 0,
        'pressure_profile': '',
        'bean': '1373c76d-eb5a-43b4-9e75-c1ee4dd035b5',
        'brew_temperature_time': 0,
        'brew_temperature': 92,
        'brew_time': 25,
        'brew_quantity': 45.8,
        'brew_quantity_type': 'GR',
        'note': '',
        'rating': 6,
        'coffee_type': 'Cappuccino ',
        'coffee_concentration': '',
        'coffee_first_drip_time': 5,
        'coffee_blooming_time': 0,
        'attachments': [],
        'config': {'uuid': '5b773f65-8cf3-4559-ac09-da8aea42bcdb', 'unix_timestamp': 1577528824}
      }, {
        'grind_size': '1,5',
        'grind_weight': 12.9,
        'method_of_preparation': '29415e5d-98bc-44a7-890c-5d104d0c5a48',
        'mill': '83249ce6-1b57-484a-84f4-08d7b2470d4e',
        'mill_speed': 0,
        'mill_timer': 0,
        'pressure_profile': '',
        'bean': '1373c76d-eb5a-43b4-9e75-c1ee4dd035b5',
        'brew_temperature_time': 0,
        'brew_temperature': 92,
        'brew_time': 25,
        'brew_quantity': 20,
        'brew_quantity_type': 'GR',
        'note': '',
        'rating': 1,
        'coffee_type': 'Cappuccino ',
        'coffee_concentration': '',
        'coffee_first_drip_time': 5,
        'coffee_blooming_time': 0,
        'attachments': [],
        'config': {'uuid': '8132ee6f-6606-454e-8a70-a4466090b046', 'unix_timestamp': 1577529063}
      }, {
        'grind_size': '1,5',
        'grind_weight': 17.9,
        'method_of_preparation': 'd6ed9d9b-8228-44c6-afcb-9e982181796d',
        'mill': '83249ce6-1b57-484a-84f4-08d7b2470d4e',
        'mill_speed': 0,
        'mill_timer': 0,
        'pressure_profile': '',
        'bean': '1373c76d-eb5a-43b4-9e75-c1ee4dd035b5',
        'brew_temperature_time': 0,
        'brew_temperature': 92,
        'brew_time': 25,
        'brew_quantity': 49.9,
        'brew_quantity_type': 'GR',
        'note': 'Leichte Nougatnote, ähnlich wie bei der Rösttrommel in Erlangen selbst. ',
        'rating': 8,
        'coffee_type': 'Cappuccino ',
        'coffee_concentration': '',
        'coffee_first_drip_time': 5,
        'coffee_blooming_time': 0,
        'attachments': [],
        'config': {'uuid': 'c9decbf9-fb92-4fd1-bacb-b8e6730686b7', 'unix_timestamp': 1577547710}
      }, {
        'grind_size': '1,5',
        'grind_weight': 16.5,
        'method_of_preparation': 'd6ed9d9b-8228-44c6-afcb-9e982181796d',
        'mill': '83249ce6-1b57-484a-84f4-08d7b2470d4e',
        'mill_speed': 0,
        'mill_timer': 0,
        'pressure_profile': '',
        'bean': 'f2f5e0b2-fffe-4570-9a07-ccaafedcf6f2',
        'brew_temperature_time': 0,
        'brew_temperature': 92,
        'brew_time': 25,
        'brew_quantity': 82.5,
        'brew_quantity_type': 'GR',
        'note': '',
        'rating': 4,
        'coffee_type': 'Cappuccino ',
        'coffee_concentration': '',
        'coffee_first_drip_time': 0,
        'coffee_blooming_time': 0,
        'attachments': [],
        'config': {'uuid': 'cecb4c13-a9ca-4263-abea-0e71e7af06cd', 'unix_timestamp': 1577622205}
      }, {
        'grind_size': '1,5',
        'grind_weight': 18.1,
        'method_of_preparation': 'd6ed9d9b-8228-44c6-afcb-9e982181796d',
        'mill': '83249ce6-1b57-484a-84f4-08d7b2470d4e',
        'mill_speed': 0,
        'mill_timer': 0,
        'pressure_profile': '',
        'bean': 'f2f5e0b2-fffe-4570-9a07-ccaafedcf6f2',
        'brew_temperature_time': 0,
        'brew_temperature': 92,
        'brew_time': 20,
        'brew_quantity': 53.1,
        'brew_quantity_type': 'GR',
        'note': '',
        'rating': 5,
        'coffee_type': 'Cappuccino ',
        'coffee_concentration': '',
        'coffee_first_drip_time': 0,
        'coffee_blooming_time': 0,
        'attachments': [],
        'config': {'uuid': 'ffa5a248-4fa3-4039-a7ef-9c7669de695f', 'unix_timestamp': 1577646966}
      }, {
        'grind_size': '1,75',
        'grind_weight': 17.2,
        'method_of_preparation': 'd6ed9d9b-8228-44c6-afcb-9e982181796d',
        'mill': '83249ce6-1b57-484a-84f4-08d7b2470d4e',
        'mill_speed': 0,
        'mill_timer': 0,
        'pressure_profile': '',
        'bean': 'f2f5e0b2-fffe-4570-9a07-ccaafedcf6f2',
        'brew_temperature_time': 0,
        'brew_temperature': 92,
        'brew_time': 25,
        'brew_quantity': 84.5,
        'brew_quantity_type': 'GR',
        'note': '',
        'rating': 5,
        'coffee_type': 'Cappuccino',
        'coffee_concentration': '',
        'coffee_first_drip_time': 0,
        'coffee_blooming_time': 0,
        'attachments': [],
        'config': {'uuid': '74c7c631-633c-4034-8538-30162bebbd25', 'unix_timestamp': 1578137905}
      }, {
        'grind_size': '1,75',
        'grind_weight': 11.8,
        'method_of_preparation': '29415e5d-98bc-44a7-890c-5d104d0c5a48',
        'mill': '83249ce6-1b57-484a-84f4-08d7b2470d4e',
        'mill_speed': 0,
        'mill_timer': 0,
        'pressure_profile': '',
        'bean': 'f2f5e0b2-fffe-4570-9a07-ccaafedcf6f2',
        'brew_temperature_time': 0,
        'brew_temperature': 92,
        'brew_time': 25,
        'brew_quantity': 40.1,
        'brew_quantity_type': 'GR',
        'note': 'Channeling ',
        'rating': 4,
        'coffee_type': 'Cappuccino ',
        'coffee_concentration': '',
        'coffee_first_drip_time': 0,
        'coffee_blooming_time': 0,
        'attachments': [],
        'config': {'uuid': 'e3b1931e-cbfe-4b9c-9663-916bb2494804', 'unix_timestamp': 1578138240}
      }],
      'MILL': [{
        'name': 'Eureka Mignon Specialità ',
        'note': '',
        'config': {'uuid': '83249ce6-1b57-484a-84f4-08d7b2470d4e', 'unix_timestamp': 1577454547}
      }],
      'PREPARATION': [{
        'name': 'Doppelt - Std.',
        'note': '',
        'config': {'uuid': 'd6ed9d9b-8228-44c6-afcb-9e982181796d', 'unix_timestamp': 1577454520}
      }, {'name': 'Einfach - Std.', 'note': '', 'config': {'uuid': '29415e5d-98bc-44a7-890c-5d104d0c5a48', 'unix_timestamp': 1577528939}}],
      'SETTINGS': [{
        'brew_view': 0,
        'startup_view': '0',
        'brew_temperature_time': false,
        'brew_time': true,
        'grind_size': true,
        'grind_weight': true,
        'mill': true,
        'mill_timer': false,
        'method_of_preparation': true,
        'brew_quantity': true,
        'bean_type': true,
        'brew_temperature': true,
        'coffee_type': true,
        'coffee_concentration': false,
        'coffee_first_drip_time': true,
        'coffee_blooming_time': false,
        'note': true,
        'attachments': true,
        'rating': true,
        'set_last_coffee_brew': true,
        'mill_speed': false,
        'pressure_profile': false,
        'set_custom_brew_time': false,
        'config': {'uuid': '7dc9fdfc-6be1-4350-be8f-0f7a9a795d8c', 'unix_timestamp': 1577454369},
        'default_last_coffee_parameters': {
          'bean_type': true,
          'brew_temperature_time': true,
          'brew_time': true,
          'grind_size': true,
          'grind_weight': false,
          'mill': true,
          'mill_timer': false,
          'method_of_preparation': true,
          'brew_quantity': false,
          'brew_temperature': true,
          'note': false,
          'coffee_type': true,
          'coffee_concentration': false,
          'coffee_first_drip_time': false,
          'coffee_blooming_time': false,
          'rating': false,
          'mill_speed': false,
          'pressure_profile': false
        },
        'brew_order': {
          'grind_size': 1,
          'grind_weight': 2,
          'brew_temperature': 3,
          'method_of_preparation': 4,
          'bean_type': 0,
          'mill': 5,
          'mill_speed': 6,
          'mill_timer': 7,
          'pressure_profile': 8,
          'brew_temperature_time': 9,
          'brew_time': 10,
          'coffee_blooming_time': 11,
          'coffee_first_drip_time': 12,
          'brew_quantity': 13,
          'coffee_type': 14,
          'coffee_concentration': 15,
          'rating': 16,
          'note': 17,
          'set_custom_brew_time': 18,
          'attachments': 19
        },
        'language': ''
      }]
    };


    this.uiStorage.import(t).then(() => {
      this.__reinitializeStorages().then(() => {
        this.__initializeSettings();
      });
    });
  }

  /* tslint:enable */
  private async __readJSONFile (path, file): Promise<any> {
    return new Promise((resolve, reject) => {
      this.file.readAsText(path, file)
          .then((content) => {
            const parsedContent = JSON.parse(content);

            // Set empty arrays if not existing.
            if (!parsedContent[this.uiPreparationStorage.getDBPath()]) {
              parsedContent[this.uiPreparationStorage.getDBPath()] = [];
            }
            if (!parsedContent[this.uiBeanStorage.getDBPath()]) {
              parsedContent[this.uiBeanStorage.getDBPath()] = [];
            }
            if (!parsedContent[this.uiBrewStorage.getDBPath()]) {
              parsedContent[this.uiBrewStorage.getDBPath()] = [];
            }
            if (!parsedContent[this.uiSettingsStorage.getDBPath()]) {
              parsedContent[this.uiSettingsStorage.getDBPath()] = [];
            }
            if (parsedContent[this.uiPreparationStorage.getDBPath()] &&
                parsedContent[this.uiBeanStorage.getDBPath()] &&
                parsedContent[this.uiBrewStorage.getDBPath()] &&
                parsedContent[this.uiSettingsStorage.getDBPath()]) {

              SettingsPage.__cleanupImportBeanData(parsedContent[this.uiBeanStorage.getDBPath()]);
              SettingsPage.__cleanupImportBrewData(parsedContent[this.uiBrewStorage.getDBPath()]);

              // When exporting the value is a number, when importing it needs to be  a string.
              parsedContent['SETTINGS'][0]['brew_view'] = parsedContent['SETTINGS'][0]['brew_view'] + '';

              this.uiStorage.import(parsedContent).then((_data) => {
                if (_data.BACKUP === false) {
                  this.__reinitializeStorages().then(() => {
                    this.__initializeSettings();

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

                    this.uiAlert.showMessage(this.translate.instant('IMPORT_SUCCESSFULLY'));
                  });

                } else {
                  this.uiAlert.showMessage(this.translate.instant('IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED'));
                }

              }, () => {
                this.uiAlert.showMessage(this.translate.instant('IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED'));
              });

            } else {
              this.uiAlert.showMessage(this.translate.instant('INVALID_FILE_DATA'));
            }
          })
          .catch((err) => {
            reject(err);

          });
    });
  }

  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.__initializeBrewOrders();
  }

  private async __reinitializeStorages (): Promise<any> {
    return new Promise((resolve) => {

      this.uiBeanStorage.reinitializeStorage();
      this.uiBrewStorage.reinitializeStorage();
      this.uiPreparationStorage.reinitializeStorage();
      this.uiSettingsStorage.reinitializeStorage();
      this.uiMillStorage.reinitializeStorage();

      const beanStorageReadyCallback = this.uiBeanStorage.storageReady();
      const preparationStorageReadyCallback = this.uiPreparationStorage.storageReady();
      const uiSettingsStorageReadyCallback = this.uiSettingsStorage.storageReady();
      const brewStorageReadyCallback = this.uiBrewStorage.storageReady();
      const millStorageReadyCallback = this.uiMillStorage.storageReady();
      Promise.all([
        beanStorageReadyCallback,
        preparationStorageReadyCallback,
        brewStorageReadyCallback,
        millStorageReadyCallback,
        uiSettingsStorageReadyCallback
      ]).then(() => {
        resolve();
      }, () => {
        resolve();
      });
    });
  }



}
