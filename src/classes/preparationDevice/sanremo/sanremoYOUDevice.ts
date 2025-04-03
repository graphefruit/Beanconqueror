import { PreparationDevice } from '../preparationDevice';
import { HttpClient } from '@angular/common/http';
import { Preparation } from '../../preparation/preparation';

import { ISanremoYOUParams } from '../../../interfaces/preparationDevices/sanremoYOU/iSanremoYOUParams';
import { SanremoYOUMode } from '../../../enums/preparationDevice/sanremo/sanremoYOUMode';
import { UILog } from '../../../services/uiLog';
import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { SanremoShotData } from './sanremoShotData';
import { UIAlert } from '../../../services/uiAlert';

export class SanremoYOUDevice extends PreparationDevice {
  public scriptList: Array<{ INDEX: number; TITLE: string }> = [];
  private socket: any = undefined;
  private sanremoShotData: SanremoShotData = new SanremoShotData();
  private _isConnected: boolean = false;
  private connectionURL: string = '';
  private websocketURL: string = '';
  /**
   * This timestamp makes sure that we just send all 250ms the weight and flow data to the machine
   */
  public sendingWeightAndFlowTimestamp = 0;
  public receivingDataFromWebsocketTimestamp = 0;
  constructor(
    protected httpClient: HttpClient,
    _preparation: Preparation,
  ) {
    super(httpClient, _preparation);

    this.connectionURL = this.getPreparation().connectedPreparationDevice.url;
    this.websocketURL = this.getPreparation().connectedPreparationDevice.url;
    if (this.websocketURL.indexOf('https:') >= 0) {
      this.websocketURL = this.websocketURL.replace('https', 'ws');
    } else {
      this.websocketURL = this.websocketURL.replace('http', 'ws');
    }
    this.websocketURL = this.websocketURL + ':81';
  }

  private logError(...args: any[]) {
    UILog.getInstance().error('SanremoYOUDevice:', ...args);
  }
  private raiseMessage(): Promise<any> {
    return UIAlert.getInstance().showConfirmWithYesNoTranslation(
      'PREPARATION_DEVICE.TYPE_SANREMO_YOU.CONNECTION_LOST_PLEASE_RECONNECT',
      'ERROR',
      'RECONNECT',
      'NO',
      true,
    );
  }
  private logInfo(...args: any[]) {
    UILog.getInstance().info('SanremoYOUDevice:', ...args);
  }

  public getActualShotData() {
    return this.sanremoShotData;
  }

  public async deviceConnected(): Promise<boolean> {
    try {
      const options = {
        url: this.connectionURL + '/api/runtime',
        connectTimeout: 5000,
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
    action: 'start' | 'stop',
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

          this.temperature = temp;
          this.pressure = press;
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

  public disconnectSocket() {
    if (this.socket !== undefined) {
      this.logInfo('Disconnecting from socket');
      this.socket.onclose = (event) => {};
      this.socket.onerror = (event) => {};
      this.socket.onopen = (event) => {};
      this.socket.close();
      this.socket = undefined;
    }
    this.receivingDataFromWebsocketTimestamp = 0;
    this._isConnected = false;
  }

  private disconnectSocketInternal() {
    this.disconnectSocket();
    this.raiseMessage().then(
      () => {
        this.reconnectToSocket();
      },
      () => {},
    );
  }

  public reconnectToSocket() {
    this.logInfo('Reconnecting from socket');
    this.socket = undefined;
    this._isConnected = false;
    this.connectToSocket();
  }
  public connectToSocket(): Promise<boolean> {
    const promise: Promise<boolean> = new Promise((resolve, reject) => {
      if (this.socket !== undefined) {
        resolve(true);
        return;
      }

      this.socket = new WebSocket(this.websocketURL);
      window['socket'] = this.socket;

      // Connection opened
      this.socket.onopen = (event) => {
        this.logInfo('Socket opened');

        this._isConnected = true;

        setTimeout(() => {
          /**
           * We wait one second, because we want to give the machine some short delay, after initial connecting
           */
          let sendData = {
            key: 221,
            appScaleConnection: 1,
            recipeWeightSetPoint: 0,
            cupWeightFromExtScale: 0,
            realTimeFlowCalcByTheScale: 0,
          };

          if (this.isConnected()) {
            this.socket.send(JSON.stringify(sendData));
          }
        }, 1000);

        let keepAliveInterval = setInterval(() => {
          if (this.isConnected()) {
            if (
              this.receivingDataFromWebsocketTimestamp > 0 &&
              Date.now() - this.receivingDataFromWebsocketTimestamp >= 4000
            ) {
              this.logError(
                'No data from machine, seems like another instance has been connecting, disconnect',
              );
              this.disconnectSocketInternal();
            } else {
              this.logInfo('Sending keep alive to machine');
              this.socket.send(JSON.stringify({}));
            }
          } else {
            if (keepAliveInterval) {
              window.clearInterval(keepAliveInterval);
              keepAliveInterval = undefined;
            } else {
            }
          }
        }, 5000);
        resolve(true);
      };

      // Listen for messages
      this.socket.onmessage = (event) => {
        //this.logInfo('Message from server:', event.data);
        const responseJSON = JSON.parse(event.data);
        if ('status' in responseJSON) {
          //Valid sanremo shot data
          let currentShotData = new SanremoShotData();
          currentShotData = responseJSON;
          currentShotData.pumpPress = currentShotData.pumpPress * 10;
          this.sanremoShotData = currentShotData;
          window['sanremoShotData'] = this.sanremoShotData;
        }
        this.receivingDataFromWebsocketTimestamp = Date.now();
      };

      // Handle errors
      this.socket.onerror = (event) => {
        resolve(false);
        this.disconnectSocketInternal();
      };

      // Handle connection close
      this.socket.onclose = (event) => {
        this.logInfo('WebSocket closed:', event);
        resolve(false);
        this.disconnectSocketInternal();
      };
    });
    return promise;
  }

  public stopActualShot() {
    if (this.isConnected()) {
      //ID -> The actual running profile
      //VALUE -> 0 -> stop, 1-> start
      if (this.sanremoShotData.groupStatus !== 0) {
        /**
         * Groupstatus 0 would shut of the machine ;) so we don't want that
         */
        this.socket.send(
          JSON.stringify({
            key: 220,
            id: this.sanremoShotData.groupStatus,
            value: 0,
          }),
        );
      }
    }
  }

  public sendJustAppConnectionToMachine() {}

  public sendActualWeightAndFlowDataToMachine(
    _weight: number,
    _flow: number,
    _targetBrewByWeight: number,
  ) {
    if (Date.now() - this.sendingWeightAndFlowTimestamp < 250) {
      return;
    } else {
    }
    this.sendingWeightAndFlowTimestamp = Date.now();

    /**
     * This data shall just be sent to the machine, when the brew-by-weight is active, else use the sendJustAppConnectionToMachine
     */
    let sendData = {
      key: 221,
      appScaleConnection: 2,
      recipeWeightSetPoint: _targetBrewByWeight,
      cupWeightFromExtScale: _weight,
      realTimeFlowCalcByTheScale: _flow,
    };
    this.logInfo('Sending weight data to machine:', sendData);
    if (this.isConnected()) {
      this.socket.send(JSON.stringify(sendData));
    }
  }
  public isConnected(): boolean {
    if (this.socket) {
      if (this.socket.readyState === 0 || this.socket.readyState === 1) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
}

export class SanremoYOUParams implements ISanremoYOUParams {
  public stopAtWeight: number = 0;
  public residualLagTime: number = 0.9;
  public selectedMode: SanremoYOUMode = SanremoYOUMode.LISTENING;

  public stopAtWeightP1: number = 0;
  public stopAtWeightP2: number = 0;
  public stopAtWeightP3: number = 0;
  public stopAtWeightM: number = 0;
  constructor() {
    this.residualLagTime = 0.9;
    this.selectedMode = SanremoYOUMode.LISTENING;
  }
}
