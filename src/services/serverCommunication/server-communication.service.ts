import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { of } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

import { ServerBrew } from '../../classes/server/brew/brew';
import { environment } from '../../environments/environment';
import { ServerBean } from '../../models/bean/serverBean';
import { UILog } from '../uiLog';

@Injectable({
  providedIn: 'root',
})
export class ServerCommunicationService {
  private http = inject(HttpClient);
  private readonly uiLog = inject(UILog);

  public uploadShot() {
    const promise = new Promise<any>((resolve, reject) => {
      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + btoa('123:1234'),
        }),
      };
      this.http
        .post('https://visualizer.coffee/api/shots/upload', {}, httpOptions)
        .pipe(
          timeout(10000),
          catchError((e) => {
            return of(null);
          }),
        )
        .toPromise()
        .then(
          (data: any) => {
            //console.log(data);
          },
          (error) => {
            //console.log(error);
            reject();
          },
        )
        .catch((error) => {
          //console.log(error);
          reject();
        });
    });
    return promise;
  }
  public getBeanInformation(_qrCodeId: string): Promise<ServerBean> {
    const promise = new Promise<ServerBean>((resolve, reject) => {
      this.http
        .get(
          environment.API_URL + 'Roaster/GetBeanFromQrCodeId?id=' + _qrCodeId,
          {},
        )
        .pipe(
          timeout(10000),
          catchError((e) => {
            return of(null);
          }),
        )
        .toPromise()
        .then(
          (data: ServerBean) => {
            if (data === null) {
              // Timeout was triggered.
              reject();
            } else {
              this.uiLog.log(`getBeanInformation - data received`, data);
              resolve(data);
            }
          },
          (error) => {
            this.uiLog.log(`getBeanInformation - error received`, error);
            reject();
          },
        )
        .catch((error) => {
          reject();
        });
    });
    return promise;
  }

  public trackBrew(brew: ServerBrew) {
    const promise = new Promise((resolve, reject) => {
      this.http
        .put(environment.API_URL + 'Roaster/TrackBrew', brew)
        .pipe(
          timeout(10000),
          catchError((e) => {
            return of(null);
          }),
        )
        .toPromise()
        .then(
          (data) => {
            if (data === null) {
              // Timeout was triggered.
              reject();
            } else {
              resolve(data);
            }
          },
          () => {
            reject();
          },
        )
        .catch((error) => {
          reject();
        });
    });
    return promise;
  }
}
