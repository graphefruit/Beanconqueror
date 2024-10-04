import { PreparationDevice } from '../preparationDevice';
import { HttpClient } from '@angular/common/http';
import { Preparation } from '../../preparation/preparation';

import { ISanremoYOUParams } from '../../../interfaces/preparationDevices/sanremoYOU/iSanremoYOUParams';
import { SanremoYOUMode } from '../../../enums/preparationDevice/sanremo/sanremoYOUMode';
import { UILog } from '../../../services/uiLog';

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
      const response = await fetch(this.connectionURL + '/api/runtime');
      return response.status === 200;
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

  public async fetchRuntimeData(): Promise<void> {
    try {
      const response = await fetch(this.connectionURL + '/api/runtime');
      const responseJSON = await response.json();

      const temp = responseJSON.tempBoilerCoffe;
      const press = responseJSON.pumpPress * 10;
      const statusPhase = responseJSON.statusPhase;

      this.temperature = temp;
      this.pressure = press;
      this.statusPhase = statusPhase;
    } catch (error) {
      this.logError('Error in fetchRuntimeData():', error);
      // don't throw/reject here!
    }
  }

  public async startShot(_mode: SanremoYOUMode): Promise<any> {
    try {
      const response = await fetch(
        this.getPreparation().connectedPreparationDevice.url +
          this.getApiEndpointForMode(_mode, 'start')
      );
      const responseJSON = await response.json();
      return responseJSON;
    } catch (error) {
      this.logError('Error in startShot():', error);
      throw error;
    }
  }

  public async stopShot(_mode: SanremoYOUMode): Promise<any> {
    try {
      const response = await fetch(
        this.getPreparation().connectedPreparationDevice.url +
          this.getApiEndpointForMode(_mode, 'stop')
      );
      const responseJSON = await response.json();
      return responseJSON;
    } catch (error) {
      this.logError('Error in stopShot():', error);
      throw error;
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
