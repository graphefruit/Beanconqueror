import { HttpClient } from '@angular/common/http';

import { CapacitorHttp, HttpResponse } from '@capacitor/core';

import { SanremoYOUMode } from '../../../enums/preparationDevice/sanremo/sanremoYOUMode';
import { ISanremoYOUParams } from '../../../interfaces/preparationDevices/sanremoYOU/iSanremoYOUParams';
import { ConfirmationDialogResult, UIAlert } from '../../../services/uiAlert';
import { UILog } from '../../../services/uiLog';
import { sleep } from '../../devices';
import { Preparation } from '../../preparation/preparation';
import { PreparationDevice } from '../preparationDevice';
import {
  hasSanremoVolumeRestarted,
  isFreshSanremoStatus,
  isSanremoShotRunning,
  nextSanremoStopStep,
  noteSanremoStopStatus,
  SANREMO_FRESH_STATUS_MS,
  SANREMO_PENDING_STOP_MS,
  SanremoStopWatch,
} from './sanremo-stop-rules';
import { SanremoShotData } from './sanremoShotData';

export type SanremoStopResult =
  | 'confirmed'
  | 'failed'
  | 'not_connected'
  | 'connection_lost'
  | 'not_running'
  | 'aborted';

/** A machine on the local network opens the socket within milliseconds; a log showed one attempt hanging for 24 s. */
const SANREMO_CONNECT_TIMEOUT_MS = 3000;
const SANREMO_STOP_CHECK_MS = 100;

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
  public reconnectTries = 0;
  public keepAliveInterval = undefined;
  public reconnectionCounter = 0;

  public lastRunnedProgramm: number = 0;
  /** sanremoShotData still holds the status from before a reconnect until this is set. */
  private statusSinceOpen = false;
  private stopRequest:
    | {
        requestedAt: number;
        timer: ReturnType<typeof setInterval>;
        /** Undefined while the stop waits for a reconnect. */
        watch?: SanremoStopWatch & { startedAt: number };
        onResend?: () => void;
        resolve: (result: SanremoStopResult) => void;
        result: Promise<SanremoStopResult>;
      }
    | undefined;

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
  private raiseMessage(): Promise<ConfirmationDialogResult> {
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

      return response.status === 200;
      // TODO Capacitor migration: The code before the migration didn't do
      // anything else, but there was unreachable code below it.
      // Please double check.
    } catch (error) {
      this.logError('Error in deviceConnected():', error);
      throw error;
    }
  }

  public async isMachineTurnedOn(): Promise<boolean> {
    try {
      const options = {
        url: this.connectionURL + '/api/runtime',
        connectTimeout: 5000,
      };
      const response: HttpResponse = await CapacitorHttp.get(options);
      const responseJSON = await response.data;

      return responseJSON.status === 1;
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
      return 0.9;
    }
  }

  public getResidualLagTimeByProgram(program: number): number {
    const connectedPreparationDevice =
      this.getPreparation().connectedPreparationDevice;
    let val: number | undefined;

    if (connectedPreparationDevice.customParams) {
      switch (program) {
        case 1:
          val = connectedPreparationDevice.customParams.residualLagTimeP1;
          break;
        case 2:
          val = connectedPreparationDevice.customParams.residualLagTimeP2;
          break;
        case 3:
          val = connectedPreparationDevice.customParams.residualLagTimeP3;
          break;
        case 4:
          val = connectedPreparationDevice.customParams.residualLagTimeM;
          break;
      }
    }

    if (val !== undefined && val !== null) {
      return val;
    }
    // Default fallback
    return 0.9;
  }

  public showInformationHintForBrewByWeightMode(): boolean {
    const connectedPreparationDevice =
      this.getPreparation().connectedPreparationDevice;
    if (connectedPreparationDevice.customParams) {
      if (
        connectedPreparationDevice.customParams.showHintForBaristaMode ===
        undefined
      ) {
        return true;
      }

      return connectedPreparationDevice.customParams.showHintForBaristaMode;
    }
    return false;
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

          let press = 0;
          if (responseJSON.pumpPress === 0) {
          } else {
            press = Number((responseJSON.pumpPress / 10).toFixed(2));
          }

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
    this.endStop('aborted');
    this.closeSocket();
  }

  /** Keeps a stop that waits for the reconnect; a sent stop can no longer be confirmed. */
  private closeSocket() {
    if (this.socket !== undefined) {
      try {
        this.logInfo('Disconnecting from socket');
        this.socket.onclose = (event) => {};
        this.socket.onerror = (event) => {};
        this.socket.onopen = (event) => {};
        this.socket.close();
        this.socket = undefined;
      } catch (ex) {}
    }
    this.receivingDataFromWebsocketTimestamp = 0;
    this._isConnected = false;
    this.statusSinceOpen = false;
    this.clearKeepAliveInterval();
    if (this.stopRequest?.watch) {
      this.logError('Connection lost before the stop was confirmed');
      this.endStop('connection_lost');
    }
  }
  private clearKeepAliveInterval() {
    if (this.keepAliveInterval) {
      window.clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = undefined;
    }
  }

  private disconnectSocketInternal() {
    this.closeSocket();
    if (this.reconnectTries <= 10) {
      this.reconnectTries = this.reconnectTries + 1;
      this.logInfo('Reconnect tries: ', this.reconnectTries);
      let timeout = 500;
      if (this.reconnectTries >= 6 && this.reconnectTries <= 8) {
        timeout = 1000;
      } else if (this.reconnectTries === 9) {
        timeout = 2000;
      } else if (this.reconnectTries === 10) {
        timeout = 4000;
      }
      setTimeout(() => {
        this.reconnectToSocket();
      }, timeout);
    } else {
      this.reconnectTries = this.reconnectTries + 1;

      // HACK: We don't handle the rejection case for this promise for now,
      //       as that would require changing the return type of this function
      //       to Promise<void> and require refactoring all callers to handle
      //       promise rejections properly.
      void this.raiseMessage().then((choice) => {
        if (choice === 'YES') {
          this.reconnectToSocket();
        }
      });
    }
  }

  public reconnectToSocket() {
    this.logInfo('Reconnecting from socket');
    this.socket = undefined;
    this._isConnected = false;
    this.connectToSocket(true);
  }
  /** retryWhenStuck: nobody awaits a reconnect, so it may give up a hanging socket. */
  public connectToSocket(retryWhenStuck = false): Promise<boolean> {
    this.logInfo('Connect to socket');
    let hasPromiseBeenCalled: boolean = false;
    const promise: Promise<boolean> = new Promise(async (resolve, reject) => {
      if (this.socket !== undefined) {
        this.logInfo('Socket seems like already connected');
        //Maybe we're in connection state but the websocket is not finished yet.
        for (let i = 0; i < 10; i++) {
          if (i != 0) {
            await sleep(250);
          }
          /**
           * We're realy connected
           */
          this.logInfo(
            'Check socket connection state ' + this.socket.readyState,
          );
          if (this.socket.readyState === 1) {
            resolve(true);
            //We can set promise been called to always true
            hasPromiseBeenCalled = true;
            //We can skip now.
            return;
          }
        }
        //Seems like the readyState never gone to "1"
        resolve(false);
        return;
      }

      try {
        const socket = new WebSocket(this.websocketURL);
        this.socket = socket;
        setTimeout(() => {
          if (
            retryWhenStuck &&
            this.socket === socket &&
            socket.readyState === 0
          ) {
            this.logInfo(
              `Socket not open after ${SANREMO_CONNECT_TIMEOUT_MS} ms, retrying`,
            );
            if (hasPromiseBeenCalled === false) {
              resolve(false);
              hasPromiseBeenCalled = true;
            }
            this.disconnectSocketInternal();
          }
        }, SANREMO_CONNECT_TIMEOUT_MS);

        // Connection opened
        this.socket.onopen = (event) => {
          this.reconnectionCounter = this.reconnectionCounter + 1;
          this.reconnectTries = 0;
          this.logInfo('Socket opened');

          this._isConnected = true;

          setTimeout(() => {
            this.sendJustAppConnectionToMachine();
          }, 1000);

          this.clearKeepAliveInterval();
          this.keepAliveInterval = setInterval(() => {
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
              this.clearKeepAliveInterval();
            }
          }, 5000);

          if (hasPromiseBeenCalled === false) {
            resolve(true);
            hasPromiseBeenCalled = true;
          }
        };

        // Listen for messages
        this.socket.onmessage = (event) => {
          this.logInfo('Message from server:', event.data);
          const responseJSON = JSON.parse(event.data);

          if ('status' in responseJSON) {
            //Valid sanremo shot data
            let currentShotData = new SanremoShotData();
            currentShotData = responseJSON;

            if (currentShotData.counterVol === 0) {
            } else {
              currentShotData.counterVol = Number(
                (currentShotData.counterVol / 10).toFixed(2),
              );
            }
            if (currentShotData.realtimeFlow === 0) {
            } else {
              currentShotData.realtimeFlow = Number(
                (currentShotData.realtimeFlow / 10).toFixed(2),
              );
            }

            if (currentShotData.pumpPress === 0) {
            } else {
              currentShotData.pumpPress = Number(
                (currentShotData.pumpPress / 10).toFixed(2),
              );
            }
            if (this.sanremoShotData.groupStatus === 0) {
              //Currently if the sanremo you is attached to the water line, it would report pressure like 1 bar because of the line pressure, which is correctly
              //To avoid this kind of issue, we overwrite the pressure when the groupstatus gets to 0 we reset the press on our side :)
              currentShotData.pumpPress = 0;
              currentShotData.realtimeFlow = 0;
            }

            if ('wifiSignal' in responseJSON) {
            } else {
              currentShotData.wifiSignal = 0;
            }

            this.sanremoShotData = currentShotData;
            this.sanremoShotData.localTimeString =
              new Date().toLocaleTimeString();
            this.sanremoShotData.reconnectionCounter = this.reconnectionCounter;
            //window['sanremoShotData'] = this.sanremoShotData;

            if (
              this.sanremoShotData.groupStatus !== 0 &&
              this.sanremoShotData.groupStatus <= 4
            ) {
              this.lastRunnedProgramm = this.sanremoShotData.groupStatus;
            }
            this.statusSinceOpen = true;
            this.watchStopStatus(
              this.sanremoShotData.groupStatus,
              this.sanremoShotData.counterVol,
            );
          } else if (responseJSON.key === 220) {
            this.noteStopAnswer(responseJSON.success === true);
          }
          this.receivingDataFromWebsocketTimestamp = Date.now();
        };

        // Handle errors
        this.socket.onerror = (event) => {
          this.logInfo('WebSocket error: ', JSON.stringify(event));

          if (hasPromiseBeenCalled === false) {
            resolve(false);
            hasPromiseBeenCalled = true;
          }

          this.disconnectSocketInternal();
        };

        // Handle connection close
        this.socket.onclose = (event) => {
          this.logInfo('WebSocket closed:', JSON.stringify(event));
          if (hasPromiseBeenCalled === false) {
            resolve(false);
            hasPromiseBeenCalled = true;
          }
          this.disconnectSocketInternal();
        };
      } catch (ex) {
        this.logInfo('Error in connectToSocket():', ex.message);
        if (hasPromiseBeenCalled === false) {
          resolve(false);
          hasPromiseBeenCalled = true;
        }
        this.disconnectSocketInternal();
      }
    });
    return promise;
  }

  /**
   * Sends the stop and watches the reported groupStatus until the machine
   * confirms it, resending at most once (see sanremo-stop-rules.ts). During a
   * reconnect the stop waits briefly for the connection.
   */
  public stopActualShot(onResend?: () => void): Promise<SanremoStopResult> {
    if (this.stopRequest) {
      return this.stopRequest.result;
    }
    const open = this.socket?.readyState === 1;
    if (!open && !this.isReconnecting()) {
      this.logError('Stop not sent, socket is not open');
      return Promise.resolve('not_connected');
    }
    const known = open && this.statusSinceOpen;
    //ID -> The actual running profile, groupStatus 0 would shut off the machine
    if (known && !isSanremoShotRunning(this.sanremoShotData.groupStatus)) {
      this.logInfo(
        `Stop not sent, groupStatus is ${this.sanremoShotData.groupStatus}`,
      );
      return Promise.resolve('not_running');
    }
    let resolve: (result: SanremoStopResult) => void;
    const result = new Promise<SanremoStopResult>((_resolve) => {
      resolve = _resolve;
    });
    this.stopRequest = {
      requestedAt: Date.now(),
      timer: setInterval(() => this.checkStop(), SANREMO_STOP_CHECK_MS),
      onResend,
      resolve,
      result,
    };
    if (known) {
      this.beginStopWatch(this.sanremoShotData.groupStatus);
    } else {
      this.logInfo(
        `Stop requested while reconnecting, waiting up to ${SANREMO_PENDING_STOP_MS} ms for the first status`,
      );
    }
    return result;
  }

  private isReconnecting(): boolean {
    return (
      this.socket?.readyState === 0 ||
      (this.socket === undefined &&
        this.reconnectTries > 0 &&
        this.reconnectTries <= 10)
    );
  }

  private beginStopWatch(groupStatus: number) {
    if (!this.sendStop(groupStatus)) {
      this.endStop('not_connected');
      return;
    }
    this.stopRequest.watch = {
      resent: false,
      sawEnd: false,
      groupStatus,
      startedAt: Date.now(),
    };
  }

  private sendStop(groupStatus: number): boolean {
    try {
      this.socket.send(JSON.stringify({ key: 220, id: groupStatus, value: 0 }));
      this.logInfo(`Stop sent at ${new Date().toISOString()}`);
      return true;
    } catch (ex) {
      this.logError('Stop could not be sent', ex?.message);
      return false;
    }
  }

  private noteStopAnswer(success: boolean) {
    const watch = this.stopRequest?.watch;
    if (!watch) {
      return;
    }
    this.logInfo(
      `Stop ${success ? 'acknowledged' : 'rejected'} after ${Date.now() - watch.startedAt} ms`,
    );
  }

  private watchStopStatus(groupStatus: number, counterVol: number) {
    const request = this.stopRequest;
    if (!request) {
      return;
    }
    if (!request.watch) {
      const waited = Date.now() - request.requestedAt;
      if (!isSanremoShotRunning(groupStatus)) {
        this.logInfo(
          `Reconnected after ${waited} ms, groupStatus is ${groupStatus}, stop not sent`,
        );
        this.endStop('not_running');
      } else {
        this.logInfo(`Reconnected after ${waited} ms, sending the stop`);
        this.beginStopWatch(groupStatus);
      }
      return;
    }
    const watch = request.watch;
    noteSanremoStopStatus(watch, groupStatus, counterVol);
    watch.statusAfterMs = Date.now() - watch.startedAt;
    if (!isSanremoShotRunning(groupStatus) && !watch.sawEnd) {
      watch.sawEnd = true;
      this.logInfo(
        `Machine reports ${groupStatus} after ${Date.now() - watch.startedAt} ms`,
      );
    }
    this.checkStop();
  }

  private checkStop() {
    const request = this.stopRequest;
    const watch = request?.watch;
    if (!watch) {
      if (
        request &&
        Date.now() - request.requestedAt >= SANREMO_PENDING_STOP_MS
      ) {
        this.logError(
          `Stop not sent, no status from the machine within ${SANREMO_PENDING_STOP_MS} ms`,
        );
        this.endStop('not_connected');
      }
      return;
    }
    const elapsed = Date.now() - watch.startedAt;
    const step = nextSanremoStopStep(watch, elapsed);
    if (step === 'wait') {
      return;
    }
    const reason = watch.sawEnd
      ? `shot restarted after it ended, ${elapsed} ms after the stop`
      : hasSanremoVolumeRestarted(watch)
        ? `shot restarted at volume ${watch.counterVol} after ${watch.maxRunningVol}, ${elapsed} ms after the stop`
        : isFreshSanremoStatus(watch)
          ? `still running ${watch.statusAfterMs} ms after the stop`
          : `no status from ${SANREMO_FRESH_STATUS_MS} ms after the stop, a second stop could start a new shot`;
    if (step === 'resend') {
      this.logInfo(
        `Stop not effective (${reason}, groupStatus ${watch.groupStatus}), resending`,
      );
      if (!this.sendStop(watch.groupStatus)) {
        this.endStop('failed');
        return;
      }
      Object.assign(watch, {
        resent: true,
        sawEnd: false,
        statusAfterMs: undefined,
        maxRunningVol: undefined,
        startedAt: Date.now(),
      });
      request.onResend?.();
      return;
    }
    if (step === 'confirmed') {
      this.logInfo(`Stop confirmed after ${elapsed} ms, no restart`);
    } else {
      this.logError(
        `Stop not confirmed (${reason}, groupStatus ${watch.groupStatus}), no further stop sent`,
      );
    }
    this.endStop(step);
  }

  private endStop(result: SanremoStopResult) {
    const request = this.stopRequest;
    if (!request) {
      return;
    }
    clearInterval(request.timer);
    this.stopRequest = undefined;
    request.resolve(result);
  }

  public async turnOnMachine() {
    try {
      const options = {
        url:
          this.getPreparation().connectedPreparationDevice.url +
          '/api/action/on',
      };

      const response: HttpResponse = await CapacitorHttp.get(options);
      const responseJSON = await response.data;
      return responseJSON.result;
    } catch (error) {
      this.logError('Error in turnOnMachine():', error);
      return false;
    }
  }

  public async turnOffMachine() {
    try {
      const options = {
        url:
          this.getPreparation().connectedPreparationDevice.url +
          '/api/action/standby',
      };

      const response: HttpResponse = await CapacitorHttp.get(options);
      const responseJSON = await response.data;
      return responseJSON.result;
    } catch (error) {
      this.logError('Error in turnOnMachine():', error);
      return false;
    }
  }

  public sendJustAppConnectionToMachine() {
    try {
      /**Sending data to the WIFI module currently makes issues, so we disable it for now **/
      return;
      if (this.isConnected()) {
        /**
         * We wait one second, because we want to give the machine some short delay, after initial connecting
         */
        const sendData = {
          key: 221,
          appScaleConnection: 1,
          recipeWeightSetPoint: 0,
          cupWeightFromExtScale: 0,
          realTimeFlowCalcByTheScale: 0,
        };
        this.socket.send(JSON.stringify(sendData));
      }
    } catch (ex) {}
  }

  public sendActualWeightAndFlowDataToMachine(
    _weight: number,
    _flow: number,
    _targetBrewByWeight: number,
  ) {
    /**Sending data to the WIFI module currently makes issues, so we disable it for now **/
    return;
    if (Date.now() - this.sendingWeightAndFlowTimestamp < 200) {
      return;
    } else {
    }
    this.sendingWeightAndFlowTimestamp = Date.now();

    if (this.isConnected()) {
      if (this.sanremoShotData?.statusPhase !== 0) {
        //this.logInfo('Sending weight data to machine:', sendData);
        //When we try to reconnect could be that we send in the sequence while disconnected and get an error.
        try {
          if (this.socket) {
            /**
             * This data shall just be sent to the machine, when the brew-by-weight is active, else use the sendJustAppConnectionToMachine
             */
            const sendData = {
              key: 221,
              appScaleConnection: 2,
              recipeWeightSetPoint: _targetBrewByWeight,
              cupWeightFromExtScale: _weight,
              realTimeFlowCalcByTheScale: _flow,
            };
            this.socket.send(JSON.stringify(sendData));
          }
        } catch (ex) {}
      } else {
        this.sendJustAppConnectionToMachine();
      }
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
      if (this.reconnectTries <= 10) {
        //We're trying to reconnect again, so fake to be connected that long, else the reconnectTries will go up to 10.
        return true;
      }
      return false;
    }
  }

  public async getDoses(): Promise<{
    key1: number;
    key2: number;
    key3: number;
    keyTea: number;
  }> {
    try {
      const options = {
        url:
          this.getPreparation().connectedPreparationDevice.url + '/api/doses',
      };
      const response: HttpResponse = await CapacitorHttp.get(options);
      return response.data;
    } catch (error) {
      this.logError('Error in getDoses():', error);
      return null;
    }
  }

  public async setDose(_key: string, _value: number): Promise<boolean> {
    try {
      const options = {
        url:
          this.getPreparation().connectedPreparationDevice.url +
          '/api/doses/' +
          _key +
          '/' +
          _value,
      };
      const response: HttpResponse = await CapacitorHttp.get(options);
      const responseJSON = response.data;
      return responseJSON.result;
    } catch (error) {
      this.logError('Error in setDose():', error);
      return false;
    }
  }
}

export class SanremoYOUParams implements ISanremoYOUParams {
  public stopAtWeight: number = 0;
  public residualLagTime: number = 0.9;

  public residualLagTimeP1: number = 0.9;
  public residualLagTimeP2: number = 0.9;
  public residualLagTimeP3: number = 0.9;
  public residualLagTimeM: number = 0.9;
  public selectedMode: SanremoYOUMode = SanremoYOUMode.LISTENING;

  public stopAtWeightP1: number = 0;
  public stopAtWeightP2: number = 0;
  public stopAtWeightP3: number = 0;
  public stopAtWeightM: number = 0;

  public showHintForBaristaMode: boolean = true;
  constructor() {
    this.residualLagTime = 0.9;
    this.residualLagTimeP1 = 0.9;
    this.residualLagTimeP2 = 0.9;
    this.residualLagTimeP3 = 0.9;
    this.residualLagTimeM = 0.9;
    this.showHintForBaristaMode = true;

    this.selectedMode = SanremoYOUMode.LISTENING;
  }
}
