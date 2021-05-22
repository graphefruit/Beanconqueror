import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ServerCommunicationService {

  constructor(private http: HttpClient) {}


  public getBeanInformation(_beanId) {
    const promise = new Promise((resolve, reject) => {
      this.http.get(environment.API_URL + 'QRCode/GetBeanByQRCodeId', {}).toPromise()
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
