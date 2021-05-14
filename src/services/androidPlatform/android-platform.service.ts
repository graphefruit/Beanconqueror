import { Injectable } from '@angular/core';
import {UIStorage} from '../uiStorage';
import {UILog} from '../uiLog';
import {UIFileHelper} from '../uiFileHelper';
import {EventQueueService} from '../queueService/queue-service.service';
import {Platform} from '@ionic/angular';
import {AppEventType} from '../../enums/appEvent/appEvent';
import {debounceTime} from 'rxjs/operators';
import {FileEntry} from '@ionic-native/file';
import {UIHelper} from '../uiHelper';
import moment from 'moment';
@Injectable({
  providedIn: 'root'
})
export class AndroidPlatformService {


  constructor(private readonly uiStorage: UIStorage,
              private readonly uiLog: UILog,
              private readonly uiFileHelper: UIFileHelper,
              private readonly eventQueue: EventQueueService,
              private readonly platform: Platform,
              private readonly uiHelper: UIHelper) {

    if (this.platform.is('cordova') && this.platform.is('android')) {
      this.uiHelper.isBeanconqurorAppReady().then(() => {
        // Delete on startup old json backup files
        this.uiFileHelper.deleteJSONBackupsOlderThenSevenDays().then(() => {

        }, () => {});
      },() => {});
      this.eventQueue.on(AppEventType.STORAGE_CHANGED).pipe(
        // Wait for 3 seconds before we call the the debounce
        debounceTime(3000)
      ).subscribe((event) => this.__saveBeanconquerorDump());
    }

  }

  private getAutomatedBackupFilename(): string {
    return moment().format('DD_MM_YYYY').toString();
  }

  private __saveBeanconquerorDump() {
    this.uiLog.log('Android-Platform - Start to export JSON file');
    this.uiStorage.export().then((_data) => {

      this.uiHelper.exportJSON('Beanconqueror_automatic_export_' + this.getAutomatedBackupFilename() + '.json', JSON.stringify(_data)).then(async (_fileEntry: FileEntry) => {
        this.uiLog.log('Android-Platform - JSON file successfully saved')
      }, () => {
        this.uiLog.error('Android-Platform - JSON file could not be saved')
      });
    });
  }

}
