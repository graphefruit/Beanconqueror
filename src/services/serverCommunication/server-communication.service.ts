import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';
import {ServerBean} from '../../models/bean/serverBean';

@Injectable({
  providedIn: 'root'
})
export class ServerCommunicationService {

  constructor(private http: HttpClient) {}


  public getBeanInformation(_qrCodeId: string): Promise<ServerBean> {
    const promise = new Promise<ServerBean>((resolve, reject) => {
      this.http.get(environment.API_URL + 'Roaster/GetBeanFromQrCodeId?Id=' + _qrCodeId, {}).toPromise()
        .then((data: ServerBean) => {
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


  public trackBrew() {
    const promise = new Promise((resolve, reject) => {
      this.http.put(environment.API_URL + 'QRCode/TrackBrew', {}).toPromise()
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
