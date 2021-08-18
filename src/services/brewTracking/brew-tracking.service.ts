import { Injectable } from '@angular/core';
import {Brew} from '../../classes/brew/brew';
import {ServerCommunicationService} from '../serverCommunication/server-communication.service';
import {UIHelper} from '../uiHelper';

@Injectable({
  providedIn: 'root'
})
export class BrewTrackingService {

  constructor(private readonly serverCommunication: ServerCommunicationService,
              private readonly uiHelper: UIHelper) { }

  public trackBrew(_brew: Brew) {
    const clonedBrew: Brew = this.uiHelper.cloneData(_brew);
    // Remove personal data.
    delete clonedBrew.coordinates;
    delete clonedBrew.attachments;

    if (clonedBrew.getBean().qr_code !== '') {
      try {
        this.serverCommunication.trackBrew(clonedBrew);
      } catch (ex) {

      }
    }

  }
}
