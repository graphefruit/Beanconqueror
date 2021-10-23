import { Injectable } from '@angular/core';
import {Platform} from '@ionic/angular';
import {UIHelper} from '../uiHelper';
import {UIBrewStorage} from '../uiBrewStorage';
import moment from 'moment';
import {UILog} from '../uiLog';
@Injectable({
  providedIn: 'root'
})
export class CleanupService {

  constructor(  private readonly platform: Platform,
                private readonly uiHelper: UIHelper,
                private readonly uiBrewStorage: UIBrewStorage,
                private readonly uiLog: UILog) {

  }

  public async cleanupOldBrewData() {

     /**
      * One log of raw data was 400kb, thats to much to store right now.
      * this.uiHelper.isBeanconqurorAppReady().then(async () => {
        this.uiLog.log(`Check if old brew data need to be updated for saving spaces`);
        const unixBefore: number = moment(new Date()).subtract(10, 'days').unix();
        const allOldBrewEntries = this.uiBrewStorage.getAllEntries().filter((_brew)=>_brew.config.unix_timestamp<=unixBefore);
        this.uiLog.log(`Check ${allOldBrewEntries.length} old brews`);
        let updatedBrews: number = 0;
        for (const brew of allOldBrewEntries) {
          if (brew.flow_profile_raw.length > 0) {
            brew.flow_profile_raw = [];
            updatedBrews+= 1;
            await this.uiBrewStorage.update(brew);
          }
        }
        this.uiLog.log(`Updated ${updatedBrews} old brews`);

      },() => {});**/

  }
}
