import { Injectable } from '@angular/core';
import { UIFileHelper } from '../uiFileHelper';
import { Visualizer } from '../../classes/visualizer/visualizer';
import { Brew } from '../../classes/brew/brew';
import { BrewFlow } from '../../classes/brew/brewFlow';
import { UIToast } from '../uiToast';
import { UIBrewStorage } from '../uiBrewStorage';
import { UISettingsStorage } from '../uiSettingsStorage';
import { Settings } from '../../classes/settings/settings';
import { UILog } from '../uiLog';

declare var cordova;

@Injectable({
  providedIn: 'root',
})
export class VisualizerService {
  constructor(
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiToast: UIToast,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiLog: UILog
  ) {}

  private async readFlowProfile(_brew: Brew): Promise<BrewFlow> {
    try {
      const jsonParsed = await this.uiFileHelper.getJSONFile(
        _brew.flow_profile
      );

      const brewFlow: BrewFlow = new BrewFlow();
      Object.assign(brewFlow, jsonParsed);
      return brewFlow;
    } catch (ex) {
      return null;
    }
  }

  public async uploadToVisualizer(_brew: Brew, _showToast: boolean = true) {
    const promise: Promise<boolean> = new Promise(async (resolve, reject) => {
      if (
        _brew.flow_profile === null ||
        _brew.flow_profile === undefined ||
        _brew.flow_profile === ''
      ) {
        return;
      }
      const settings: Settings = this.uiSettingsStorage.getSettings();
      const vS: Visualizer = new Visualizer();
      try {
        vS.mapBrew(_brew);
        vS.mapBean(_brew.getBean());
        vS.mapWater(_brew.getWater());
        vS.mapPreparation(_brew.getPreparation());
        vS.mapMill(_brew.getMill());
        vS.brewFlow = await this.readFlowProfile(_brew);
        // Put the actual visualizer id into the request if we stored one
        if (_brew.customInformation && _brew.customInformation.visualizer_id) {
          vS.visualizerId = _brew.customInformation.visualizer_id;
        }
      } catch (ex) {}
      if (vS.brewFlow === null || vS.brewFlow === undefined) {
        this.uiLog.log('Upload visualizer shot - We did not find any brewflow');
        // We could not read the data - maybe import data where missing.
        reject();
        return;
      }

      try {
        const fileData = await this.uiFileHelper.saveJSONFile(
          'VisualizerUploadShotTemp_' + _brew.config.uuid + '.json',
          JSON.stringify(vS)
        );

        // Define HTTP basic authentication credentials
        const username = settings.visualizer_username;
        const password = settings.visualizer_password;
        const credentials = btoa(username + ':' + password);
        const headers = {
          Authorization: 'Basic ' + credentials,
        };

        const url = settings.visualizer_url + 'api/shots/upload'; // 'https://visualizer.coffee/api/shots/upload';

        this.uiLog.log(
          'Upload visualizer shot - ' +
            'VisualizerUploadShotTemp_' +
            _brew.config.uuid +
            '.json'
        );
        cordova.plugin.http.uploadFile(
          url,
          undefined,
          headers,
          fileData.NATIVE_URL,
          'file',
          async (_successData) => {
            try {
              await this.uiFileHelper.deleteFile(fileData.FULL_PATH);
            } catch (ex) {}

            if (_successData && 'data' in _successData) {
              this.uiLog.log('Upload visualizer shot successfully');
              const dataObj = JSON.parse(_successData.data);
              const visualizerId = dataObj.id;
              _brew.customInformation.visualizer_id = visualizerId;
              await this.uiBrewStorage.update(_brew);
            } else {
              this.uiLog.log('Upload visualizer shot not successfully');
            }

            setTimeout(() => {
              if (_showToast === true) {
                this.uiToast.showInfoToastBottom(
                  'VISUALIZER.SHOT.UPLOAD_SUCCESSFULLY'
                );
              }

              resolve(undefined);
            }, 75);
          },
          (_errorData) => {
            this.uiLog.log('Upload visualizer shot error occured');
            if (_showToast === true) {
              this.uiToast.showInfoToastBottom(
                'VISUALIZER.SHOT.UPLOAD_UNSUCCESSFULLY'
              );
            }
            this.uiLog.error(JSON.stringify(_errorData));
            reject();
          }
        );
      } catch (ex) {
        this.uiLog.log(
          'Upload visualizer shot excpection occured' + ex.message
        );
        reject();
      }
    });
    return promise;
  }

  public async checkConnection() {
    const promise: Promise<boolean> = new Promise(async (resolve, reject) => {
      const settings: Settings = this.uiSettingsStorage.getSettings();
      const username = settings.visualizer_username;
      const password = settings.visualizer_password;
      const credentials = btoa(username + ':' + password);

      const url = settings.visualizer_url + 'api/me'; // 'https://visualizer.coffee/api/shots/upload';
      const options = {
        method: 'get',
        headers: { Authorization: 'Basic ' + credentials },
      };
      cordova.plugin.http.sendRequest(
        url,
        options,
        (response) => {
          try {
            if (response && 'data' in response) {
              resolve(undefined);
            } else {
              this.uiLog.error(
                'Visualizer check connection, no data object given - ' +
                  JSON.stringify(response)
              );
              reject();
            }
          } catch (e) {
            this.uiLog.error(
              'Visualizer check connection, try catch triggered - ' +
                JSON.stringify(response)
            );
            reject();
          }
        },
        (response) => {
          // prints 403
          this.uiLog.error(JSON.stringify(response));
          reject();
        }
      );
    });
    return promise;
  }
}
