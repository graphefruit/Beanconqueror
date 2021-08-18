import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {ServerBean} from '../../models/bean/serverBean';
import {UILog} from '../uiLog';
import {Brew} from '../../classes/brew/brew';

@Injectable({
  providedIn: 'root'
})
export class ServerCommunicationService {

  constructor(private http: HttpClient, private readonly uiLog: UILog) {}


  public getBeanInformation(_qrCodeId: string): Promise<ServerBean> {
    const promise = new Promise<ServerBean>((resolve, reject) => {
      this.http.get(environment.API_URL + 'Roaster/GetBeanFromQrCodeId?Id=' + _qrCodeId, {}).toPromise()
        .then((data: ServerBean) => {
          this.uiLog.log(`getBeanInformation - data received - ${JSON.stringify(data)}`);
          resolve(data);
        },(error) => {
          console.log(error);
          reject();
        })
        .catch((error) => {
         reject();
        });
    });
    return promise;
  }


  public trackBrew(brew: Brew) {
    const promise = new Promise((resolve, reject) => {
      this.http.put(environment.API_URL + 'Tracking/Brew', {}).toPromise()
        .then((data) => {
          resolve(data);
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
