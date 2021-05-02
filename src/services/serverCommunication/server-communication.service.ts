import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ServerCommunicationService {

  constructor(private http: HttpClient) {}


  public getBeanInformation() {
    /*
    this.http.get('', {}).toPromise()
      .then((data) => {

        console.log(data);
        console.log(data); // data received by server
        console.log(data);

      })
      .catch((error) => {

        console.log(error.status);
        console.log(error.error); // error message as string
        console.log(error.headers);

      });*/
  }
}
