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
      const jsonParsed = await this.uiFileHelper.readInternalJSONFile(
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

  public async uploadToVisualizer(
    _brew: Brew,
    _showToast: boolean = true
  ): Promise<void> {
    if (!_brew.flow_profile) {
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
      const errorMessage =
        'Cannot upload visualizer shot because the data does not contain any brewflow';
      this.uiLog.error(errorMessage);
      // We could not read the data - maybe import data where missing.
      throw new Error(errorMessage);
    }

    try {
      const url = settings.visualizer_url + 'api/shots/upload'; // 'https://visualizer.coffee/api/shots/upload';
      const formData = new FormData();
      const contentJSON = JSON.stringify(vS);
      const contentFile = new File([contentJSON], 'visualizer.json', {
        type: 'application/json',
      });
      formData.append('file', contentFile);

      // fetch() is patched by CapacitorHttp to perform the request from the
      // native side. It's not possible to use the CapacitorHttp API for
      // mulipart form upload, only the patched fetch() can do it
      const result = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: this.getAuthHeaders(settings),
      });
      const responseJson = await result.json();

      const visualizerId = responseJson.id;
      if (!visualizerId) {
        throw new Error(
          'Received invalid visualizer reponse: ' + JSON.stringify(responseJson)
        );
      }
      _brew.customInformation.visualizer_id = visualizerId;
      await this.uiBrewStorage.update(_brew);

      if (_showToast === true) {
        this.uiToast.showInfoToastBottom('VISUALIZER.SHOT.UPLOAD_SUCCESSFULLY');
      }
      return;
    } catch (error) {
      this.uiLog.error('Upload visualizer shot error occurred', error);
      if (_showToast === true) {
        this.uiToast.showInfoToastBottom(
          'VISUALIZER.SHOT.UPLOAD_UNSUCCESSFULLY'
        );
      }
      throw error;
    }
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
