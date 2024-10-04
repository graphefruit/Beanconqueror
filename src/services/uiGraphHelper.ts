/** Core */
import { Injectable } from '@angular/core';
import { UIBrewStorage } from './uiBrewStorage';

import { UIAnalytics } from './uiAnalytics';
import { ModalController, Platform } from '@ionic/angular';
import { Graph } from '../classes/graph/graph';
import { GraphEditComponent } from '../app/graph-section/graph/graph-edit/graph-edit.component';
import { GraphAddComponent } from '../app/graph-section/graph/graph-add/graph-add.component';
import { GraphDetailComponent } from '../app/graph-section/graph/graph-detail/graph-detail.component';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';
import { UIAlert } from './uiAlert';
import { TranslateService } from '@ngx-translate/core';
import { UILog } from './uiLog';
import { UIFileHelper } from './uiFileHelper';
import BeanconquerorFlowTestDataDummy from '../assets/BeanconquerorFlowTestDataFourth.json';
import { Brew } from '../classes/brew/brew';

/**
 * Handles every helping functionalities
 */

declare var window: any;
declare var FilePicker;

@Injectable({
  providedIn: 'root',
})
export class UIGraphHelper {
  constructor(
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiAnalytics: UIAnalytics,
    private readonly modalController: ModalController,
    private readonly platform: Platform,
    private readonly fileChooser: FileChooser,
    private readonly uiAlert: UIAlert,
    private readonly translate: TranslateService,
    private readonly uiLog: UILog,
    private readonly uiFileHelper: UIFileHelper
  ) {}

  public async addGraph() {
    const modal = await this.modalController.create({
      component: GraphAddComponent,
      id: GraphAddComponent.COMPONENT_ID,
      componentProps: {},
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async editGraph(_graph: Graph) {
    const editModal = await this.modalController.create({
      component: GraphEditComponent,
      componentProps: { graph: _graph },
      id: GraphEditComponent.COMPONENT_ID,
    });
    await editModal.present();
    await editModal.onWillDismiss();
  }

  public async detailGraph(_graph: Graph) {
    const modal = await this.modalController.create({
      component: GraphDetailComponent,
      id: GraphDetailComponent.COMPONENT_ID,
      componentProps: { graph: _graph },
    });
    await modal.present();
    await modal.onWillDismiss();
  }
  public async detailBrewGraph(_brew: Brew) {
    const modal = await this.modalController.create({
      component: GraphDetailComponent,
      id: GraphDetailComponent.COMPONENT_ID,
      componentProps: { brew: _brew },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async detailGraphRawData(_flowData: any) {
    const modal = await this.modalController.create({
      component: GraphDetailComponent,
      id: GraphDetailComponent.COMPONENT_ID,
      componentProps: { flowProfileData: _flowData },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public async chooseGraph(): Promise<any> {
    if (this.platform.is('android')) {
      const uri = await this.fileChooser.open();
      try {
        const data = await this.uiFileHelper.readJSONFile(uri);
        return data;
      } catch (error) {
        this.uiAlert.showMessage(
          this.translate.instant('ERROR_ON_FILE_READING') + error
        );
        throw error;
      }
    } else {
      return this.chooseGraphIOS();
    }
  }

  private chooseGraphIOS(): Promise<any> {
    return new Promise((resolve, reject) => {
      FilePicker.pickFile(
        (uri) => {
          if (uri.endsWith('.json')) {
            let path = uri.substring(0, uri.lastIndexOf('/'));
            const file = uri.substring(uri.lastIndexOf('/') + 1, uri.length);
            if (path.indexOf('file://') !== 0) {
              path = 'file://' + path;
            }

            // TODO Capacitor migration: Check if this works on iOS
            this.uiFileHelper
              .readJSONFile(path + '/' + file)
              .then((_data) => {
                // nothing todo
                resolve(_data);
              })
              .catch((_err) => {
                reject();
                this.uiAlert.showMessage(
                  this.translate.instant('FILE_NOT_FOUND_INFORMATION') +
                    ' (' +
                    JSON.stringify(_err) +
                    ')'
                );
              });
          } else {
            this.uiAlert.showMessage(
              this.translate.instant('INVALID_FILE_FORMAT')
            );
          }
        },
        () => {}
      );
    });
  }

  public async saveGraph(_uuid: string, _jsonObj): Promise<string> {
    const savingPath = 'graphs/' + _uuid + '_flow_profile.json';
    await this.uiFileHelper.writeInternalFileFromText(
      JSON.stringify(_jsonObj),
      savingPath
    );
    return savingPath;
  }

  public async readFlowProfile(_flowProfilePath: string) {
    return new Promise(async (resolve, reject) => {
      if (this.platform.is('cordova')) {
        if (_flowProfilePath !== '') {
          try {
            const jsonParsed = await this.uiFileHelper.readInternalJSONFile(
              _flowProfilePath
            );
            resolve(jsonParsed);
          } catch (ex) {
            reject();
          }
        } else {
          reject();
        }
      } else {
        resolve(BeanconquerorFlowTestDataDummy as any);
      }
    });
  }
}
