import { PreparationDevice } from '../preparationDevice';
import { HttpClient } from '@angular/common/http';
import { Preparation } from '../../preparation/preparation';

import { IXeniaParams } from '../../../interfaces/preparationDevices/iXeniaParams';
import { UILog } from '../../../services/uiLog';

export class XeniaDevice extends PreparationDevice {
  public scriptList: Array<{ INDEX: number; TITLE: string }> = [];

  private apiVersion: number = 2;
  constructor(protected httpClient: HttpClient, _preparation: Preparation) {
    super(httpClient, _preparation);

    const connectedPreparationDevice =
      this.getPreparation().connectedPreparationDevice;
    if (
      connectedPreparationDevice.customParams &&
      connectedPreparationDevice.customParams.apiVersion
    ) {
      if (connectedPreparationDevice.customParams.apiVersion === 'V1') {
        this.apiVersion = 1;
      } else {
      }
    }
  }

  private logError(...args: any[]) {
    UILog.getInstance().error('XeniaDevice:', ...args);
  }

  public override async deviceConnected(): Promise<boolean> {
    try {
      const responseJSON = await this.getOverview();
      if (responseJSON && 'MA_STATUS' in responseJSON) {
        return true;
      }

      const errorMessage = `Unexpected JSON response: ${JSON.stringify(
        responseJSON
      )}`;
      this.logError(errorMessage);
      throw new Error(errorMessage);
    } catch (error) {
      this.logError('Error in deviceConnected():', error);
      throw error;
    }
  }

  public getPressure() {
    return this.pressure;
  }

  public getResidualLagTime() {
    const connectedPreparationDevice =
      this.getPreparation().connectedPreparationDevice;
    if (
      connectedPreparationDevice.customParams &&
      connectedPreparationDevice.customParams.residualLagTime
    ) {
      return connectedPreparationDevice.customParams.residualLagTime;
    } else {
      // Fixed value.
      return 1.35;
    }
  }

  public getSaveLogfilesFromMachine(): boolean {
    const connectedPreparationDevice =
      this.getPreparation().connectedPreparationDevice;
    if (
      connectedPreparationDevice.customParams &&
      connectedPreparationDevice.customParams.saveLogfilesFromMachine
    ) {
      return connectedPreparationDevice.customParams.saveLogfilesFromMachine;
    } else {
      // Fixed value.
      return false;
    }
  }

  public getTemperature() {
    return this.temperature;
  }
  public getDevicetemperature() {
    return this.deviceTemperature;
  }

  public async fetchPressureAndTemperature(): Promise<void> {
    try {
      const responseJSON = await this.getOverview();
      this.temperature = responseJSON.BG_SENS_TEMP_A;
      this.pressure = responseJSON.PU_SENS_PRESS;
    } catch (error) {
      this.logError('Error in fetchPressureAndTemperature():', error);
      // don't throw/reject here!
    }
  }

  public async fetchAndSetDeviceTemperature(): Promise<void> {
    let url = this.getPreparation().connectedPreparationDevice.url;
    if (this.apiVersion === 1) {
      url += '/overview_single';
    } else {
      url += '/api/v2/overview_single';
    }

    try {
      const response = await fetch(url);
      const responseJSON = await response.json();

      this.deviceTemperature = responseJSON.BG_SET_TEMP;
    } catch (error) {
      this.logError('Error in fetchAndSetDeviceTemperature():', error);
      // don't throw/reject here!
    }
  }

  public async getOverview(): Promise<any> {
    let url = this.getPreparation().connectedPreparationDevice.url;
    if (this.apiVersion === 1) {
      url += '/overview';
    } else {
      url += '/api/v2/overview';
    }

    try {
      const response = await fetch(url);
      const responseJSON = await response.json();
      return responseJSON;
    } catch (error) {
      this.logError('Error in getOverview():', error);
      throw error;
    }
  }

  public async getScripts(): Promise<any> {
    let url = this.getPreparation().connectedPreparationDevice.url;
    if (this.apiVersion === 1) {
      url += '/scripts_list';
    } else {
      url += '/api/v2/scripts/list';
    }

    try {
      const response = await fetch(url);
      const responseJSON = await response.json();
      return responseJSON;
    } catch (error) {
      this.logError('Error in getScripts():', error);
      throw error;
    }
  }

  public async getLogs(): Promise<any> {
    let url = this.getPreparation().connectedPreparationDevice.url;
    if (this.apiVersion === 1) {
      //Was not supported in V1 at all
      return undefined;
    } else {
      url += '/api/v2/logs';
    }

    try {
      const response = await fetch(url);
      const responseJSON = await response.json();
      return responseJSON;
    } catch (error) {
      this.logError('Error in getLogs():', error);
      throw error;
    }
  }

  public mapScriptsAndSaveTemp(_serverRespList: any) {
    this.scriptList = [];
    for (let i = 0; i < _serverRespList.index_list.length; i++) {
      const addIndex = _serverRespList.index_list[i];
      const addTitle = _serverRespList.title_list[i];
      this.scriptList.push({
        TITLE: addTitle,
        INDEX: addIndex,
      });
    }
  }

  public async startScript(_id: any): Promise<any> {
    let url = this.getPreparation().connectedPreparationDevice.url;
    let options: RequestInit;

    // TODO Capacitor migration: It's very likely that this will be broken by
    // the migration, please test again.
    if (this.apiVersion === 1) {
      url += '/execute_script';
      options = {
        method: 'POST',
        body: JSON.stringify({ ID: _id }),
        headers: {
          // TODO Capacitor migration: This would be the most sane thing to do,
          // but I don't know if the API is sane
          'Content-Type': 'application/json',
        },
      };
    } else {
      url += '/api/v2/scripts/execute';
      options = {
        method: 'post',
        body: JSON.stringify({ ID: _id }),
        headers: {
          // TODO Capacitor migration: This looks completely insane,
          // test it please. The body is clearly JSON and not form encoded
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
      };
    }

    try {
      const response = await fetch(url, options);
      const responseJSON = await response.json();
      return responseJSON;
    } catch (error) {
      this.logError('Error in startScript():', error);
      throw error;
    }
  }

  public async stopScript(): Promise<any> {
    let url = this.getPreparation().connectedPreparationDevice.url;
    if (this.apiVersion === 1) {
      url += '/stop_script';
    } else {
      url += '/api/v2/scripts/stop';
    }

    try {
      // Yes, starting is a POST and stopping is a GET
      const response = await fetch(url, { method: 'GET' });
      const responseJSON = await response.json();
      return responseJSON;
    } catch (error) {
      this.logError('Error in stopScript():', error);
      throw error;
    }
  }
}

export class XeniaParams implements IXeniaParams {
  public scriptStartId: number = 0;
  public scriptAtFirstDripId: number = 0;
  public scriptAtWeightReachedId: number = 0;
  public scriptAtWeightReachedNumber: number = 0;
  public residualLagTime: number = 0;

  constructor() {}
}
