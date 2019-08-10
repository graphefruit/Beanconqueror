import { Component, OnInit } from '@angular/core';
import {BREW_VIEW_ENUM} from '../../enums/settings/brewView';
import {ISettings} from '../../interfaces/settings/iSettings';
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
import {UIBrewHelper} from '../../services/uiBrewHelper';
import {UIMillStorage} from '../../services/uiMillStorage';
import {IOSFilePicker} from '@ionic-native/file-picker/ngx';
import {SocialSharing} from '@ionic-native/social-sharing/ngx';
import {FileEntry} from '@ionic-native/file';
import {File} from '@ionic-native/file/ngx';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {Brew} from '../../classes/brew/brew';
import {Mill} from '../../classes/mill/mill';

@Component({
  selector: 'settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  public settings: ISettings;

  public BREW_VIEWS = BREW_VIEW_ENUM;

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
              private readonly socialSharing: SocialSharing) {
    this.__initializeSettings();
  }

  public ngOnInit() {
  }

  public saveSettings (_event: any): void {
    this.uiSettingsStorage.saveSettings(this.settings);
  }

  public import (): void {

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
                  this.uiAlert.showMessage('Fehler beim Dateiauslesen (' + JSON.stringify(_err) + ')');
                });

              }).catch((_err) => {
                this.uiAlert.showMessage('Datei konnte nicht gefunden werden (' + JSON.stringify(_err) + ')');
              });
            } else {
              this.uiAlert.showMessage('Invalides Dateiformat');
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
            this.uiAlert.showMessage('Datei konnte nicht gefunden werden (' + JSON.stringify(_err) + ')');
          });
        } else {
          this.uiAlert.showMessage('Invalides Dateiformat');
        }
      });

    }

  }

  public isMobile (): boolean {
    if (this.platform.is('android') || this.platform.is('ios')) {
      return true;
    }

    return false;
  }

  public export(): void {

    this.uiStorage.export().then((_data) => {

      this.uiHelper.exportJSON('Beanconqueror.json', JSON.stringify(_data)).then(async (_fileEntry: FileEntry) => {
        if (this.platform.is('android')) {
          const alert =  await this.alertCtrl.create({
            header: 'Heruntergeladen!',
            subHeader: `JSON-Datei '${_fileEntry.name}' wurde erfolgreich in den Download-Ordner heruntergeladen!`,
            buttons: ['OK']
          });
          await alert.present();
        } else {
          this.socialSharing.share(undefined, undefined, _fileEntry.nativeURL);
        }

      });
    });

  }

  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  private async __readJSONFile (path, file): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      this.file.readAsText(path, file)
          .then((content) => {
            const parsedContent = JSON.parse(content);
            if (parsedContent[this.uiPreparationStorage.getDBPath()] &&
                parsedContent[this.uiBeanStorage.getDBPath()] &&
                parsedContent[this.uiBrewStorage.getDBPath()] &&
                parsedContent[this.uiSettingsStorage.getDBPath()]) {

              this.__cleanupImportBeanData(parsedContent[this.uiBeanStorage.getDBPath()]);
              this.__cleanupImportBrewData(parsedContent[this.uiBrewStorage.getDBPath()]);

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

                    this.uiAlert.showMessage('Import erfolgreich');
                  });

                } else {
                  this.uiAlert.showMessage('Import unerfolgreich, Daten wurden nicht verändert');
                }

              }, () => {
                this.uiAlert.showMessage('Import unerfolgreich, Daten wurden nicht verändert');
              });

            } else {
              this.uiAlert.showMessage('Invalider Dateiinhalt');
            }
          })
          .catch((err) => {
            reject(err);

          });
    });

    return promise;

  }

  private async __reinitializeStorages (): Promise<any> {
    const promise = new Promise((resolve, reject) => {

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

    return promise;
  }

  private __cleanupImportBeanData(_data: Array<IBean>): any {
    if (_data !== undefined && _data !== undefined && _data.length > 0) {
      for (const bean of _data) {
        bean.filePath = '';
      }
    }
  }

  private __cleanupImportBrewData(_data: Array<IBrew>): void {
    if (_data !== undefined && _data !== undefined && _data.length > 0) {
      for (const brew of _data) {
        brew.attachments = [];
      }
    }
  }

}
