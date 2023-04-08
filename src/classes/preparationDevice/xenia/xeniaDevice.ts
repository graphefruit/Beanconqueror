import { PreparationDevice } from '../preparationDevice';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import { Preparation } from '../../preparation/preparation';
declare var cordova;
export class XeniaDevice extends PreparationDevice {
  public scriptStartId: number = 0;
  public scriptAtFirstDripId: number = 0;
  public scriptAtWeightReachedId: number = 0;
  public scriptAtWeightReachedNumber: number = 0;

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
              reject();
            }
          } catch (e) {
            reject();
          }
        },
        (response) => {
          // prints 403
          reject();
        }
      );
    });
    return promise;
  }

  public getScripts() {
    const promise = new Promise<boolean>((resolve, reject) => {
      const options = {
        method: 'get',
      };
      cordova.plugin.http.sendRequest(
        this.getPreparation().connectedPreparationDevice.url + '/scripts_list',
        options,
        (response) => {
          try {
            const parsedJSON = JSON.parse(response.data);
            console.log(parsedJSON);
            resolve(parsedJSON);
          } catch (e) {
            reject();
          }
        },
        (response) => {
          // prints 403
          reject();
        }
      );
    });
    return promise;
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
            console.log(parsedJSON);
            resolve(parsedJSON);
          } catch (e) {
            reject();
          }
        },
        (response) => {
          // prints 403
          reject();
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
            console.log(parsedJSON);
            resolve(parsedJSON);
          } catch (e) {
            reject();
          }
        },
        (response) => {
          // prints 403
          reject();
        }
      );
    });
    return promise;
  }
}
