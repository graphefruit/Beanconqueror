/**Core**/
import {Component} from '@angular/core';

/**Interfaces**/
import {ISettings} from '../../interfaces/settings/iSettings';
/**Enums**/
import {BREW_VIEW_ENUM} from '../../enums/settings/brewView';

/**Services**/
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {UIStorage} from "../../services/uiStorage";
import {UIHelper} from "../../services/uiHelper";

/**Native imports**/
import {File, FileEntry} from "@ionic-native/file";
import {FileChooser} from '@ionic-native/file-chooser';
import {AlertController, Platform} from "ionic-angular";
import {FilePath} from "@ionic-native/file-path";
import {UIAlert} from "../../services/uiAlert";
import {UIPreparationStorage} from "../../services/uiPreparationStorage";
import {UIBeanStorage} from "../../services/uiBeanStorage";
import {UIBrewStorage} from "../../services/uiBrewStorage";


import {IBean} from "../../interfaces/bean/iBean";
import {IBrew} from "../../interfaces/brew/iBrew";
import {IOSFilePicker} from "@ionic-native/file-picker";
import {SocialSharing} from "@ionic-native/social-sharing";
import {UIMillStorage} from "../../services/uiMillStorage";
import {Mill} from "../../classes/mill/mill";
import {Brew} from "../../classes/brew/brew";
@Component({
  templateUrl: 'settings.html'
})
export class SettingsPage {

  settings: ISettings;

  public BREW_VIEWS = BREW_VIEW_ENUM;

  constructor(public platform: Platform,
              public uiSettingsStorage: UISettingsStorage,
              public uiStorage: UIStorage,
              public uiHelper: UIHelper,
              private fileChooser: FileChooser,
              private filePath: FilePath,
              private file: File, private alertCtrl: AlertController,
              private uiAlert: UIAlert,
              private uiPreparationStorage: UIPreparationStorage,
              private uiBeanStorage: UIBeanStorage,
              private uiBrewStorage: UIBrewStorage,
              private uiMillStorage: UIMillStorage,
              private iosFilePicker: IOSFilePicker,
              private socialSharing:SocialSharing) {
      this.__initializeSettings();
  }

  private __initializeSettings(){
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public saveSettings(_event: any) {
    this.uiSettingsStorage.saveSettings(this.settings);
  }

  public import() {

    if (this.platform.is("android")) {
      this.fileChooser.open()
        .then((uri) => {
          if (uri && uri.endsWith(".json")) {
            this.filePath.resolveNativePath(uri).then(resolvedFilePath => {
              let path = resolvedFilePath.substring(0, resolvedFilePath.lastIndexOf('/'));
              let file = resolvedFilePath.substring(resolvedFilePath.lastIndexOf('/') + 1, resolvedFilePath.length);
              this.__readJSONFile(path, file).then(() => {
              }, (_err) => {
                this.uiAlert.showMessage("Fehler beim Dateiauslesen (" + JSON.stringify(_err) + ")");
              })

            }).catch(_err => {
              this.uiAlert.showMessage("Datei konnte nicht gefunden werden (" + JSON.stringify(_err) + ")");
            });
          } else {
            this.uiAlert.showMessage("Invalides Dateiformat");
          }
        });


    }
    else {
      this.iosFilePicker.pickFile().then((uri) => {
        if (uri && uri.endsWith(".json")) {

            let path = uri.substring(0, uri.lastIndexOf('/'));
            let file = uri.substring(uri.lastIndexOf('/') + 1, uri.length);
            if (path.indexOf("file://") !== 0)
            {
              path = "file://" + path;
            }
            this.__readJSONFile(path, file).then(() => {

          }).catch(_err => {
            this.uiAlert.showMessage("Datei konnte nicht gefunden werden (" + JSON.stringify(_err) + ")");
          });
        } else {
          this.uiAlert.showMessage("Invalides Dateiformat");
        }
      });

    }

  }

  private __readJSONFile(path, file) {
    var promise = new Promise((resolve, reject) => {
      this.file.readAsText(path, file)
        .then(content => {
          let parsedContent = JSON.parse(content);
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

                  if (this.uiBrewStorage.getAllEntries().length > 0 && this.uiMillStorage.getAllEntries().length <=0)
                  {
                    //We got an update and we got no mills yet, therefore we add a Standard mill.
                    let data:Mill = new Mill();
                    data.name = "Standard";
                    this.uiMillStorage.add(data);

                    let brews:Array<Brew> = this.uiBrewStorage.getAllEntries();
                    for (let i=0;i<brews.length;i++)
                    {
                      brews[i].mill = data.config.uuid;

                      this.uiBrewStorage.update(brews[i]);
                    }
                  }

                  this.uiAlert.showMessage("Import erfolgreich");
                })

              }
              else {
                this.uiAlert.showMessage("Import unerfolgreich, Daten wurden nicht verändert");
              }

            }, () => {
              this.uiAlert.showMessage("Import unerfolgreich, Daten wurden nicht verändert");
            })

          }
          else {
            this.uiAlert.showMessage("Invalider Dateiinhalt");
          }
        })
        .catch(err => {
          reject(err);

        });
    });

    return promise;

  }

  private __reinitializeStorages() {
    var promise = new Promise((resolve, reject) => {

      this.uiBeanStorage.reinitializeStorage();
      this.uiBrewStorage.reinitializeStorage();
      this.uiPreparationStorage.reinitializeStorage();
      this.uiSettingsStorage.reinitializeStorage();
      this.uiMillStorage.reinitializeStorage();

      let beanStorageReadyCallback = this.uiBeanStorage.storageReady();
      let preparationStorageReadyCallback = this.uiPreparationStorage.storageReady();
      let uiSettingsStorageReadyCallback = this.uiSettingsStorage.storageReady();
      let brewStorageReadyCallback = this.uiBrewStorage.storageReady();
      let millStorageReadyCallback = this.uiMillStorage.storageReady();
      Promise.all([
        beanStorageReadyCallback,
        preparationStorageReadyCallback,
        brewStorageReadyCallback,
        millStorageReadyCallback,
        uiSettingsStorageReadyCallback,
      ]).then(() => {
        resolve();
      }, () => {
        resolve();
      })
    });
    return promise;
  }

  private __cleanupImportBeanData(_data: Array<IBean>) {
    if (_data != null && _data != undefined && _data.length > 0) {
      for (let i = 0; i < _data.length; i++) {
        _data[i].filePath = "";
      }
    }
  }

  private __cleanupImportBrewData(_data: Array<IBrew>) {
    if (_data != null && _data != undefined && _data.length > 0) {
      for (let i = 0; i < _data.length; i++) {
        _data[i].attachments = [];
      }
    }
  }

  public isMobile() {
    if (this.platform.is("android") === true || this.platform.is("ios") === true)
    {
      return true;
    }
    else {
      return false;
    }
  }
  public export() {

    this.uiStorage.export().then((_data) => {

      this.uiHelper.exportJSON("Beanconqueror.json", JSON.stringify(_data)).then((_fileEntry:FileEntry) => {
      if (this.platform.is("android"))
      {
        let alert = this.alertCtrl.create({
          title: 'Heruntergeladen!',
          subTitle: `JSON-Datei '${_fileEntry.name}' wurde erfolgreich in den Download-Ordner heruntergeladen!`,
          buttons: ['OK']
        });
        alert.present();
      }
      else {
        this.socialSharing.share(null,null,_fileEntry.nativeURL);
      }


      })
    })

  }
}
