import { PreparationDevice } from '../preparationDevice';
import { HttpClient } from '@angular/common/http';
import { Preparation } from '../../preparation/preparation';

import { ISanremoYOUParams } from '../../../interfaces/preparationDevices/sanremoYOU/iSanremoYOUParams';
import { SanremoYOUMode } from '../../../enums/preparationDevice/sanremo/sanremoYOUMode';

declare var cordova;
export class SanremoYOUDevice extends PreparationDevice {
  public scriptList: Array<{ INDEX: number; TITLE: string }> = [];

  private connectionURL: string = '';
  private statusPhase: number = 0;
  constructor(protected httpClient: HttpClient, _preparation: Preparation) {
    super(httpClient, _preparation);

    this.connectionURL = this.getPreparation().connectedPreparationDevice.url;
  }

  public async deviceConnected(): Promise<boolean> {
    const promise = new Promise<boolean>((resolve, reject) => {
      const options = {
        method: 'get',
      };
      let urlAdding = '/api/runtime';

      cordova.plugin.http.sendRequest(
        this.connectionURL + urlAdding,
        options,
        (response) => {
          try {
            const parsedJSON = JSON.parse(response.data);
            resolve(true);
            return;

            if (parsedJSON && 'id' in parsedJSON) {
              resolve(true);
            } else {
              reject('');
            }
          } catch (e) {
            // alert("Error in Resolve " + JSON.stringify(e));
            reject(JSON.stringify(e));
          }
        },
        (response) => {
          // prints 403
          // alert("Error " + JSON.stringify(response));
          reject(JSON.stringify(response));
        }
      );
    });
    return promise;
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

  public fetchRuntimeData(_callback: any = null) {
    const options = {
      method: 'get',
    };
    const urlAdding = '/api/runtime';

    cordova.plugin.http.sendRequest(
      this.connectionURL + urlAdding,
      options,
      (response) => {
        try {
          /**{"status":1,"description":"ON","statusPhase":0,"alarms":0,"warnings":2,"tempBoilerCoffe":82.1,"tempBolierServices":100.2,"pumpServicesPress":0.2,"pumpPress":0.0,"counterVol":0,"realtimeFlow":0,"setPressPaddle":0.0}**/
          const parsedJSON = JSON.parse(response.data);
          const temp = parsedJSON.tempBoilerCoffe;
          const press = parsedJSON.pumpPress * 10;
          const statusPhase = parsedJSON.statusPhase;

          this.temperature = temp;
          this.pressure = press;
          this.statusPhase = statusPhase;
          if (_callback) {
            _callback();
          }
        } catch (e) {}
      },
      (response) => {
        // prints 403
      }
    );
  }

  public startShot(_mode: SanremoYOUMode) {
    const promise = new Promise<boolean>((resolve, reject) => {
      const options = {
        method: 'get',
      };

      let urlAdding = '';
      if (_mode === SanremoYOUMode.MANUAL_CONTROLLING) {
        urlAdding = '/api/action/man/start';
      } else if (_mode === SanremoYOUMode.PROFILE_P1_CONTROLLING) {
        urlAdding = '/api/action/p1/start';
      } else if (_mode === SanremoYOUMode.PROFILE_P2_CONTROLLING) {
        urlAdding = '/api/action/p2/start';
      } else if (_mode === SanremoYOUMode.PROFILE_P3_CONTROLLING) {
        urlAdding = '/api/action/p3/start';
      }

      cordova.plugin.http.sendRequest(
        this.getPreparation().connectedPreparationDevice.url + urlAdding,
        options,
        (response) => {
          try {
            const parsedJSON = JSON.parse(response.data);
            resolve(parsedJSON);
          } catch (e) {
            reject(JSON.stringify(e));
          }
        },
        (response) => {
          // prints 403
          reject(JSON.stringify(response));
        }
      );
    });
    return promise;
  }
  public stopShot(_mode: SanremoYOUMode) {
    const promise = new Promise<boolean>(async (resolve, reject) => {
      const options = {
        method: 'get',
      };

      let urlAdding = '';
      if (_mode === SanremoYOUMode.MANUAL_CONTROLLING) {
        urlAdding = '/api/action/man/stop';
      } else if (_mode === SanremoYOUMode.PROFILE_P1_CONTROLLING) {
        urlAdding = '/api/action/p1/stop';
      } else if (_mode === SanremoYOUMode.PROFILE_P2_CONTROLLING) {
        urlAdding = '/api/action/p2/stop';
      } else if (_mode === SanremoYOUMode.PROFILE_P3_CONTROLLING) {
        urlAdding = '/api/action/p3/stop';
      }

      cordova.plugin.http.sendRequest(
        this.getPreparation().connectedPreparationDevice.url + urlAdding,
        options,
        (response) => {
          try {
            const parsedJSON = JSON.parse(response.data);
            resolve(parsedJSON);
          } catch (e) {
            reject(JSON.stringify(e));
          }
        },
        (response) => {
          // prints 403
          reject(JSON.stringify(response));
        }
      );
    });
    return promise;
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
