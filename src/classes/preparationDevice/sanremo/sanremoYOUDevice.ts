import { PreparationDevice } from '../preparationDevice';
import { HttpClient } from '@angular/common/http';
import { Preparation } from '../../preparation/preparation';

import { ISanremoYOUParams } from '../../../interfaces/preparationDevices/sanremoYOU/iSanremoYOUParams';
import { SanremoYOUMode } from '../../../enums/preparationDevice/sanremo/sanremoYOUMode';
import { UILog } from '../../../services/uiLog';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';

export class SanremoYOUDevice extends PreparationDevice {
  public scriptList: Array<{ INDEX: number; TITLE: string }> = [];

  private connectionURL: string = '';
  private statusPhase: number = 0;
  constructor(protected httpClient: HttpClient, _preparation: Preparation) {
    super(httpClient, _preparation);

    this.connectionURL = this.getPreparation().connectedPreparationDevice.url;
  }

  private logError(...args: any[]) {
    UILog.getInstance().error('SanremoYOUDevice:', ...args);
  }

  public async deviceConnected(): Promise<boolean> {
    try {
      const options = {
        url: this.connectionURL + '/api/runtime',
      };
      const response: HttpResponse = await CapacitorHttp.get(options);
      const responseJSON = await response.data;

      return responseJSON.status === 200;
      // TODO Capacitor migration: The code before the migration didn't do
      // anything else, but there was unreachable code below it.
      // Please double check.
    } catch (error) {
      this.logError('Error in deviceConnected():', error);
      throw error;
    }
  }

  private getApiEndpointForMode(
    mode: SanremoYOUMode,
    action: 'start' | 'stop'
  ): string {
    switch (mode) {
      case SanremoYOUMode.MANUAL_CONTROLLING:
        return '/api/action/man/' + action;
      case SanremoYOUMode.PROFILE_P1_CONTROLLING:
        return '/api/action/p1/' + action;
      case SanremoYOUMode.PROFILE_P2_CONTROLLING:
        return '/api/action/p2/' + action;
      case SanremoYOUMode.PROFILE_P3_CONTROLLING:
        return '/api/action/p3/' + action;
      default:
        throw new Error(`Unexpected mode: ${mode}`);
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

  public async fetchRuntimeData(_callback: any = null): Promise<void> {
    try {
      const options = {
        url: this.connectionURL + '/api/runtime',
      };
      CapacitorHttp.get(options)
        .then((_response) => {
          const responseJSON = _response.data;
          const temp = responseJSON.tempBoilerCoffe;
          const press = responseJSON.pumpPress * 10;
          const statusPhase = responseJSON.statusPhase;

          this.temperature = temp;
          this.pressure = press;
          this.statusPhase = statusPhase;
          if (_callback) {
            _callback();
          }
        })
        .catch((_error) => {
          this.logError('Error in fetchRuntimeData():', _error);
        });
    } catch (error) {
      this.logError('Error in fetchRuntimeData():', error);
      // don't throw/reject here!
    }
  }

  public async startShot(_mode: SanremoYOUMode): Promise<any> {
    try {
      const options = {
        url:
          this.getPreparation().connectedPreparationDevice.url +
          this.getApiEndpointForMode(_mode, 'start'),
      };
      CapacitorHttp.get(options)
        .then((_response) => {
          const responseJSON = _response.data;
        })
        .catch((_error) => {
          this.logError('Error in startShot():', _error);
        });
    } catch (error) {
      this.logError('Error in startShot():', error);
    }
  }

  public async stopShot(_mode: SanremoYOUMode): Promise<any> {
    try {
      const options = {
        url:
          this.getPreparation().connectedPreparationDevice.url +
          this.getApiEndpointForMode(_mode, 'stop'),
      };
      CapacitorHttp.get(options)
        .then((_response) => {
          const responseJSON = _response.data;
        })
        .catch((_error) => {
          this.logError('Error in startShot():', _error);
        });
    } catch (error) {
      this.logError('Error in stopShot():', error);
    }
  }
}

export class SanremoYOUParams implements ISanremoYOUParams {
  public stopAtWeight: number = 0;
  public residualLagTime: number = 0.9;
  public selectedMode: SanremoYOUMode = SanremoYOUMode.LISTENING;
  constructor() {
    this.residualLagTime = 0.9;
    this.selectedMode = SanremoYOUMode.LISTENING;
  }
}
