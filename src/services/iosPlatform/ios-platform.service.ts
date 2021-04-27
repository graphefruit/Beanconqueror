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


}
