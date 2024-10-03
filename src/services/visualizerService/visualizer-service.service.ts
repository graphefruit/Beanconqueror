import { Injectable } from '@angular/core';
import { CapacitorHttp } from '@capacitor/core';
import { UIFileHelper } from '../uiFileHelper';
import { Visualizer } from '../../classes/visualizer/visualizer';
import { Brew } from '../../classes/brew/brew';
import { BrewFlow } from '../../classes/brew/brewFlow';
import { UIToast } from '../uiToast';
import { UIBrewStorage } from '../uiBrewStorage';
import { UISettingsStorage } from '../uiSettingsStorage';
import { Settings } from '../../classes/settings/settings';
import { UILog } from '../uiLog';
import { Directory, Filesystem } from '@capacitor/filesystem';

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

  private getAuthHeaders(settings: Settings) {
    const username = settings.visualizer_username;
    const password = settings.visualizer_password;
    const credentials = btoa(username + ':' + password);
    return {
      Authorization: 'Basic ' + credentials,
    };
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
        try {
          if (_brew.tds > 0) {
            vS.brew.ey = Number(_brew.getExtractionYield());
          }
        } catch (ex) {}

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
        const savedFilePath = await this.uiFileHelper.writeFileFromText(
          JSON.stringify(vS),
          'VisualizerUploadShotTemp_' + _brew.config.uuid + '.json',
          Directory.Cache
        );
        const { uri: fileUri } = await Filesystem.getUri({
          path: savedFilePath,
          directory: Directory.Cache,
        });
        this.uiLog.debug('Uploading visualizer data from URI ', fileUri);

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
          this.getAuthHeaders(settings),
          fileUri,
          'file',
          async (_successData) => {
            try {
              await this.uiFileHelper.deleteFile(
                savedFilePath,
                Directory.Cache
              );
            } catch (ex) {
              this.uiLog.error(
                'Could not delete cache file',
                savedFilePath,
                '; error',
                ex
              );
            }

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
        this.uiLog.log('Upload visualizer shot exception occurred', ex.message);
        reject();
      }
    });
    return promise;
  }

  public async checkConnection(): Promise<boolean> {
    const settings: Settings = this.uiSettingsStorage.getSettings();

    try {
      const response = await CapacitorHttp.get({
        url: settings.visualizer_url + 'api/me', // https://visualizer.coffee/api/me
        headers: this.getAuthHeaders(settings),
      });
      if (response.status === 200 && response.data) {
        this.uiLog.info(
          'Visualizer connection check successful, got data:',
          response.data
        );
        return true;
      }

      this.uiLog.error(
        'Visualizer connection check did not return data:',
        JSON.stringify(response)
      );
      return false;
    } catch (errorResponse) {
      // Typical case that ends up here: wrong credentials, 401 status code
      this.uiLog.error(
        'Visualizer connection check errored:',
        JSON.stringify(errorResponse)
      );
      return false;
    }
  }
}
