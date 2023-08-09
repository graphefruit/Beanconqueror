import { PreparationDevice } from '../preparationDevice';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import { Preparation } from '../../preparation/preparation';
import { IConfig } from '../../../interfaces/objectConfig/iObjectConfig';
import { IXeniaParams } from '../../../interfaces/preparationDevices/iXeniaParams';
declare var cordova;
export class XeniaDevice extends PreparationDevice {
  public scriptList: Array<{ INDEX: number; TITLE: string }> = [];

  constructor(protected httpClient: HttpClient, _preparation: Preparation) {
    super(httpClient, _preparation);

    if (typeof cordova !== 'undefined') {
    }
  }

  public override async deviceConnected(): Promise<boolean> {
    const promise = new Promise<boolean>((resolve, reject) => {
      const options = {
        method: 'get',
      };
      cordova.plugin.http.sendRequest(
        this.getPreparation().connectedPreparationDevice.url + '/overview',
        options,
        (response) => {
          try {
            const parsedJSON = JSON.parse(response.data);
            if (parsedJSON && 'MA_STATUS' in parsedJSON) {
              resolve(true);
            } else {
              // alert("Error in Resolve MA Status not given");
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
  public getTemperature() {
    return this.temperature;
  }
  public getDevicetemperature() {
    return this.deviceTemperature;
  }

  public fetchPressureAndTemperature(_callback: any = null) {
    const options = {
      method: 'get',
    };
    cordova.plugin.http.sendRequest(
      this.getPreparation().connectedPreparationDevice.url + '/overview',
      options,
      (response) => {
        try {
          const parsedJSON = JSON.parse(response.data);
          const temp = parsedJSON.BG_SENS_TEMP_A;
          const press = parsedJSON.PU_SENS_PRESS;

          this.temperature = temp;
          this.pressure = press;
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
  public fetchAndSetDeviceTemperature(_callback: any = null) {
    const options = {
      method: 'get',
    };
    cordova.plugin.http.sendRequest(
      this.getPreparation().connectedPreparationDevice.url + '/overview_single',
      options,
      (response) => {
        try {
          const parsedJSON = JSON.parse(response.data);
          const setDevicetemp = parsedJSON.BG_SET_TEMP;

          this.deviceTemperature = setDevicetemp;
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

  public getOverview(): Promise<any> {
    const promise = new Promise<any>((resolve, reject) => {
      const options = {
        method: 'get',
      };
      cordova.plugin.http.sendRequest(
        this.getPreparation().connectedPreparationDevice.url + '/overview',
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

  public getScripts() {
    const promise = new Promise<any>((resolve, reject) => {
      const options = {
        method: 'get',
      };
      cordova.plugin.http.sendRequest(
        this.getPreparation().connectedPreparationDevice.url + '/scripts_list',
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

  public startScript(_id: any) {
    const promise = new Promise<boolean>((resolve, reject) => {
      const options = {
        method: 'post',
        data: { ID: _id },
      };

      cordova.plugin.http.sendRequest(
        this.getPreparation().connectedPreparationDevice.url +
          '/execute_script',
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

  public stopScript() {
    const promise = new Promise<boolean>((resolve, reject) => {
      const options = {
        method: 'get',
      };

      cordova.plugin.http.sendRequest(
        this.getPreparation().connectedPreparationDevice.url + '/stop_script',
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

export class XeniaParams implements IXeniaParams {
  public scriptStartId: number = 0;
  public scriptAtFirstDripId: number = 0;
  public scriptAtWeightReachedId: number = 0;
  public scriptAtWeightReachedNumber: number = 0;

  constructor() {}
}
