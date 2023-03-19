import { PreparationDevice } from '../preparationDevice';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import { Preparation } from '../../preparation/preparation';

export class XeniaDevice extends PreparationDevice {
  constructor(protected httpClient: HttpClient, _preparation: Preparation) {
    super(httpClient, _preparation);
  }

  public override async deviceConnected(): Promise<boolean> {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa('1:1#'),
      }),
    };
    const promise = new Promise<boolean>((resolve, reject) => {
      this.httpClient
        .get(
          this.getPreparation().connectedPreparationDevice.url + '/overview',
          httpOptions
        )
        .pipe(
          timeout(10000),
          catchError((e) => {
            return of(null);
          })
        )
        .toPromise()
        .then((_data) => {
          if (_data && 'MA_STATUS' in _data) {
            resolve(true);
          } else {
            reject();
          }
        })
        .catch((error) => {
          reject();
        });
    });
    return promise;
  }

  public getScripts() {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa('1:1#'),
      }),
    };
    const promise = new Promise<boolean>((resolve, reject) => {
      this.httpClient
        .get(
          this.getPreparation().connectedPreparationDevice.url +
            '/scripts_list',
          httpOptions
        )
        .pipe(
          timeout(10000),
          catchError((e) => {
            return of(null);
          })
        )
        .toPromise()
        .then((_data) => {
          console.log(_data);
          if (_data) {
            resolve(true);
          } else {
            reject();
          }
        })
        .catch((error) => {
          reject();
        });
    });
    return promise;
  }

  public startScript(_id: any) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa('1:1#'),
      }),
    };
    const promise = new Promise<boolean>((resolve, reject) => {
      let data = {};
      data['ID'] = _id;
      this.httpClient
        .post(
          this.getPreparation().connectedPreparationDevice.url +
            '/execute_script',
          data,
          httpOptions
        )
        .pipe(
          timeout(10000),
          catchError((e) => {
            return of(null);
          })
        )
        .toPromise()
        .then((_data) => {
          if (_data) {
            resolve(true);
          } else {
            reject();
          }
        })
        .catch((error) => {
          reject();
        });
    });
    return promise;
  }

  public stopScript() {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa('1:1#'),
      }),
    };
    const promise = new Promise<boolean>((resolve, reject) => {
      this.httpClient
        .get(
          this.getPreparation().connectedPreparationDevice.url + '/stop_script',
          httpOptions
        )
        .pipe(
          timeout(10000),
          catchError((e) => {
            return of(null);
          })
        )
        .toPromise()
        .then((_data) => {
          console.log(_data);
          if (_data) {
            resolve(true);
          } else {
            reject();
          }
        })
        .catch((error) => {
          reject();
        });
    });
    return promise;
  }
}
