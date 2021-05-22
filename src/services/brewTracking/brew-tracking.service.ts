import { Injectable } from '@angular/core';
import {Brew} from '../../classes/brew/brew';
import {ServerCommunicationService} from '../serverCommunication/server-communication.service';

@Injectable({
  providedIn: 'root'
})
export class BrewTrackingService {

  constructor(private readonly serverCommunication: ServerCommunicationService) { }

  public trackBrew(_brew: Brew) {
    if (_brew.getBean().qr_code !== '') {
      try {
        this.serverCommunication.trackBrew();
      } catch (ex) {

      }
    }

  }
}
