import { Injectable } from '@angular/core';

import {UIStorage} from '../uiStorage';
import {UIFileHelper} from '../uiFileHelper';
import {UILog} from '../uiLog';
import {EventQueueService} from '../queueService/queue-service.service';
import {AppEventType} from '../../enums/appEvent/appEvent';
import {Platform} from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class IosPlatformService {

  constructor(private readonly uiStorage: UIStorage,
              private readonly uiLog: UILog,
              private readonly uiFileHelper: UIFileHelper,
              private readonly eventQueue: EventQueueService,
              private readonly platform: Platform) {

    if (this.platform.is('cordova') && this.platform.is('ios')) {
      this.eventQueue.on(AppEventType.STORAGE_CHANGED).subscribe((event) => this.__saveBeanconquerorDump());
    }

  }

  private __saveBeanconquerorDump() {
    this.uiStorage.export().then((_data) => {
      this.uiFileHelper.saveJSONFile('Beanconqueror.json', JSON.stringify(_data)).then(async () => {
        this.uiLog.log('JSON file successfully saved')
      }, () => {
        this.uiLog.error('JSON file not saved')
      })
    });
  }

  public async checkIOSBackup() {
    try {
      this.uiLog.log('iOS-Platform - Check IOS Backup');
      const hasData = await this.uiStorage.hasData();
      this.uiLog.log('iOS-Platform - Check IOS Backup - Has data ' + hasData);
      if (!hasData) {
        this.uiLog.log('iOS-Platform - Check IOS Backup - No data are stored yet inside the app, so we try to find a backup file - maybe its an iCloud installation');
        // If we don't got any data, we check now if there is a Beanconqueror.json saved.
        this.uiFileHelper.getJSONFile('Beanconqueror.json').then((_json) => {
          this.uiLog.log('iOS-Platform - We found an iCloud backup, try to import');
          this.uiStorage.import(_json).then(() => {
            this.uiLog.log('iOS-Platform sucessfully imported iCloud Backup');
          },() => {
            this.uiLog.error('iOS-Platform could not import iCloud Backup');
          });
        })
      }
    }catch(ex) {

    }


  }


}
