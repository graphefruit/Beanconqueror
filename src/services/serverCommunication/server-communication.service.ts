import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {ServerBean} from '../../models/bean/serverBean';
import {UILog} from '../uiLog';
import {ServerBrew} from '../../classes/server/brew/brew';
import {catchError, timeout} from 'rxjs/operators';
import {of} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ServerCommunicationService {

  constructor(private http: HttpClient, private readonly uiLog: UILog) {}


  public getBeanInformation(_qrCodeId: string): Promise<ServerBean> {
    const promise = new Promise<ServerBean>((resolve, reject) => {
      this.http.get(environment.API_URL + 'Roaster/GetBeanFromQrCodeId?id=' + _qrCodeId, {}).pipe(timeout(10000),catchError((e)=>{
        return of(null);
      })).toPromise()
        .then((data: ServerBean) => {
          if (data === null) {
            // Timeout was triggered.
            reject();
          } else {
            this.uiLog.log(`getBeanInformation - data received - ${JSON.stringify(data)}`);
            resolve(data);
          }

        },(error) => {
          this.uiLog.log(`getBeanInformation - error received - ${JSON.stringify(error)}`);
          reject();
        })
        .catch((error) => {
         reject();
        });
    });
    return promise;
  }


  public trackBrew(brew: ServerBrew) {
    const promise = new Promise((resolve, reject) => {
      this.http.put(environment.API_URL + 'Roaster/TrackBrew', brew).pipe(timeout(10000),catchError((e)=>{
        return of(null);
      })).toPromise()
        .then((data) => {
          if (data === null) {
            // Timeout was triggered.
            reject();
          } else {
            resolve(data);
          }
        },() => {
          reject();
        })
        .catch((error) => {
          reject();
        });
    });
    return promise;
  }
}
