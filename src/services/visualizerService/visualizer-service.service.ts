import { inject, Injectable } from '@angular/core';

import { CapacitorCookies, CapacitorHttp } from '@capacitor/core';

import { Brew } from '../../classes/brew/brew';
import { BrewFlow } from '../../classes/brew/brewFlow';
import { Settings } from '../../classes/settings/settings';
import { Visualizer } from '../../classes/visualizer/visualizer';
import { UIAlert } from '../uiAlert';
import { UIBrewHelper } from '../uiBrewHelper';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIFileHelper } from '../uiFileHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIToast } from '../uiToast';

@Injectable({
  providedIn: 'root',
})
export class VisualizerService {
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiLog = inject(UILog);
  private readonly uiBrewHelper = inject(UIBrewHelper);
  private readonly uiAlert = inject(UIAlert);

  private async readFlowProfile(_brew: Brew): Promise<BrewFlow> {
    try {
      const jsonParsed = await this.uiFileHelper.readInternalJSONFile(
        _brew.flow_profile,
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

  public async importShotWithSharedCode(_shareCode: string): Promise<void> {
    let errorOccured: boolean = true;
    try {
      const url =
        'https://visualizer.coffee/api/shots/shared?' +
        new URLSearchParams({
          code: _shareCode,
          with_data: '1',
        });
      this.uiLog.info('Get SHOT-Data from visualizer ', url);

      const result = await fetch(url);
      const responseJSON = await result.json();
      const isArrayResp = Array.isArray(responseJSON);
      if (
        (isArrayResp && responseJSON[0].hasOwnProperty('brewdata')) ||
        'brewdata' in responseJSON
      ) {
        let visualizerRespData;
        if (isArrayResp) {
          visualizerRespData = responseJSON[0]['brewdata'];
        } else {
          visualizerRespData = responseJSON['brewdata'];
        }
        if (
          visualizerRespData.application === 'BEANCONQUEROR' &&
          visualizerRespData.brewFlow
        ) {
          errorOccured = false;
          const brewFlow = visualizerRespData.brewFlow;
          this.uiBrewHelper.addBrewFromVisualizerWithGraph(brewFlow);
        }
      }
    } catch (error) {
      this.uiLog.error('Error while getting shot data from visualizer', error);
    }
    if (errorOccured) {
      this.uiAlert.showMessage(
        'VISUALIZER_SHOT_IMPORT_FAILED',
        'ERROR_OCCURED',
        'OK',
        true,
      );
    }
  }

  public async uploadToVisualizer(
    _brew: Brew,
    _showToast: boolean = true,
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
          'Received invalid visualizer reponse: ' +
            JSON.stringify(responseJson),
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
          'VISUALIZER.SHOT.UPLOAD_UNSUCCESSFULLY',
        );
      }
      throw error;
    }
  }

  public async checkConnection(): Promise<boolean> {
    const settings: Settings = this.uiSettingsStorage.getSettings();

    try {
      await CapacitorCookies.clearCookies({
        url: settings.visualizer_url,
      });
      const response = await CapacitorHttp.get({
        url: settings.visualizer_url + 'api/me', // https://visualizer.coffee/api/me
        headers: this.getAuthHeaders(settings),
      });
      if (response.status === 200 && response.data) {
        this.uiLog.info(
          'Visualizer connection check successful, got data:',
          response.data,
        );
        return true;
      }

      this.uiLog.error(
        'Visualizer connection check did not return data:',
        response,
      );
      return false;
    } catch (errorResponse) {
      // Typical case that ends up here: wrong credentials, 401 status code
      this.uiLog.error('Visualizer connection check errored:', errorResponse);
      return false;
    }
  }
}
