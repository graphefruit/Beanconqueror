import { PreparationDevice } from '../preparationDevice';
import { HttpClient } from '@angular/common/http';
import { Preparation } from '../../preparation/preparation';

import moment from 'moment';
import {
  BrewFlow,
  IBrewPressureFlow,
  IBrewRealtimeWaterFlow,
  IBrewTemperatureFlow,
  IBrewWeightFlow,
} from '../../brew/brewFlow';
import { IGaggiuinoParams } from '../../../interfaces/preparationDevices/gaggiuino/iGaggiuinoParams';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { UILog } from '../../../services/uiLog';

declare var cordova;

export class GaggiuinoDevice extends PreparationDevice {
  private connectionURL: string = '';

  public static returnBrewFlowForShotData(_shotData) {
    const newMoment = moment(new Date()).startOf('day');
    const newBrewFlow = new BrewFlow();

    const datapoints = _shotData.datapoints;

    for (let i = 0; i < datapoints.timeInShot.length; i++) {
      const shotEntry: any = datapoints;
      const shotEntryTime = newMoment
        .clone()
        .add('seconds', shotEntry.timeInShot[i] / 10);
      const timestamp = shotEntryTime.format('HH:mm:ss.SSS');

      const realtimeWaterFlow: IBrewRealtimeWaterFlow =
        {} as IBrewRealtimeWaterFlow;

      realtimeWaterFlow.brew_time = '';
      realtimeWaterFlow.timestamp = timestamp;
      realtimeWaterFlow.smoothed_weight = 0;
      realtimeWaterFlow.flow_value = shotEntry.pumpFlow[i] / 10;
      realtimeWaterFlow.timestampdelta = 0;

      newBrewFlow.realtimeFlow.push(realtimeWaterFlow);

      const brewFlow: IBrewWeightFlow = {} as IBrewWeightFlow;
      brewFlow.timestamp = timestamp;
      brewFlow.brew_time = '';
      brewFlow.actual_weight = shotEntry.shotWeight[i] / 10;
      brewFlow.old_weight = 0;
      brewFlow.actual_smoothed_weight = 0;
      brewFlow.old_smoothed_weight = 0;
      brewFlow.not_mutated_weight = 0;
      newBrewFlow.weight.push(brewFlow);

      const pressureFlow: IBrewPressureFlow = {} as IBrewPressureFlow;
      pressureFlow.timestamp = timestamp;
      pressureFlow.brew_time = '';
      pressureFlow.actual_pressure = shotEntry.pressure[i] / 10;
      pressureFlow.old_pressure = 0;
      newBrewFlow.pressureFlow.push(pressureFlow);

      const temperatureFlow: IBrewTemperatureFlow = {} as IBrewTemperatureFlow;
      temperatureFlow.timestamp = timestamp;
      temperatureFlow.brew_time = '';
      temperatureFlow.actual_temperature = shotEntry.temperature[i] / 10;
      temperatureFlow.old_temperature = 0;
      newBrewFlow.temperatureFlow.push(temperatureFlow);
    }
    return newBrewFlow;
  }

  constructor(
    protected httpClient: HttpClient,
    _preparation: Preparation,
  ) {
    super(httpClient, _preparation);
    this.connectionURL = this.getPreparation().connectedPreparationDevice.url;

    if (typeof cordova !== 'undefined') {
    }
  }

  public async deviceConnected(): Promise<boolean> {
    try {
      const options = {
        url: this.connectionURL + '/api/system/status',
        connectTimeout: 5000,
      };
      const response: HttpResponse = await CapacitorHttp.get(options);
      return response.status === 200;
      // TODO Capacitor migration: The code before the migration didn't do
      // anything else, but there was unreachable code below it.
      // Please double check.
    } catch (error) {
      this.logError('Error in deviceConnected():', error);
      throw error;
    }
  }

  public async getShotData(_id: number) {
    try {
      const options = {
        url: this.connectionURL + '/api/shots/' + _id,
        connectTimeout: 5000,
      };
      const response: HttpResponse = await CapacitorHttp.get(options);
      const responseJSON = await response.data;
      if (response.status === 404) {
        return null;
      }
      return responseJSON;
      //return Number(responseJSON[0].lastShotId);

      // TODO Capacitor migration: The code before the migration didn't do
      // anything else, but there was unreachable code below it.
      // Please double check.
    } catch (error) {
      this.logError('Error in getLastShotId():', error);
      return null;
    }
  }
  public async getLastShotId(): Promise<number> {
    try {
      const options = {
        url: this.connectionURL + '/api/shots/latest',
        connectTimeout: 5000,
      };
      const response: HttpResponse = await CapacitorHttp.get(options);
      const responseJSON = await response.data;
      return Number(responseJSON[0].lastShotId);

      // TODO Capacitor migration: The code before the migration didn't do
      // anything else, but there was unreachable code below it.
      // Please double check.
    } catch (error) {
      this.logError('Error in getLastShotId():', error);
      return null;
    }
  }

  private logError(...args: any[]) {
    UILog.getInstance().error('GaggiuinoDevice:', ...args);
  }
}

export class GaggiuinoParams implements IGaggiuinoParams {
  public chosenProfileId: number;
  public chosenProfileName: string;
  public shotId: number;
  constructor() {
    this.chosenProfileId = 0;
    this.chosenProfileName = '';
    this.shotId = 0;
  }
}
