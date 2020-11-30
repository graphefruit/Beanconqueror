/** Core */
import {Injectable} from '@angular/core';
import {InAppBrowser} from '@ionic-native/in-app-browser/ngx';
/** Ionic */
import {Platform} from '@ionic/angular';
/** Third party */
import moment from 'moment';
// tslint:disable-next-line
import 'moment/locale/de';
import {DomSanitizer, SafeUrl} from '@angular/platform-browser';
import {File} from '@ionic-native/file/ngx';
import {UIFileHelper} from './uiFileHelper';
import {UILog} from './uiLog';

declare var cordova: any;
declare var device: any;
declare var window: any;
/**
 * Handles every helping functionalities
 */

@Injectable({
  providedIn: 'root'
})
export class UIHelper {


  public static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      // tslint:disable
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  public static getUnixTimestamp(): number {
    return moment()
      .unix();
  }
  /**
   *
   */
  private isAppReady: number = -1;
  constructor (private readonly platform: Platform,
               private readonly inAppBrowser: InAppBrowser,
               private readonly sanitizer: DomSanitizer,
               private readonly file: File,
               private readonly uiFileHelper: UIFileHelper,
               private readonly uiLog: UILog) {

  }

  public copyData(_value: any): any {
    if (_value) {
      if (_value.constructor === Array) {
        return {...[], ..._value};
      }

      return {..._value};
    }
    return undefined;

  }

  public generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      // tslint:disable
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  public getUnixTimestamp(): number {
    return moment()
      .unix();
  }

  public isToday(_unix: number): boolean {
    return moment.unix(moment()
      .unix())
      .isSame(moment.unix(_unix), 'd');
  }

  public formateDatestr(_unix: string, _format?: string): string {

    let format: string = 'DD.MM.YYYY, HH:mm:ss';
    if (_format) {
      format = _format;

    }
    return moment(_unix)
      .format(format);
  }

  public formateDate(_unix: number, _format?: string): string {

    let format: string = 'DD.MM.YYYY, HH:mm:ss';
    if (_format) {
      format = _format;

    }

    return moment.unix(_unix)
      .format(format);
  }

  public timeDifference(_unix: number): any {
    const now = moment.unix(this.getUnixTimestamp());
    const toDiff = moment(moment.unix(_unix));
    const timeDifference = {
      MILLISECONDS: 0,
      SECONDS: 0,
      MINUTES: 0,
      HOURS: 0,
      DAYS: 0
    };

    timeDifference.MILLISECONDS = now.diff(toDiff, 'milliseconds');
    timeDifference.SECONDS = now.diff(toDiff, 'seconds');
    timeDifference.MINUTES = now.diff(toDiff, 'minutes');
    timeDifference.HOURS = now.diff(toDiff, 'hours');
    timeDifference.DAYS = now.diff(toDiff, 'days');
    return timeDifference;
  }

  public async attachOnPlatformReady (): Promise<any> {
    return this.platform.ready();
  }

  /**
   *
   * @param _ready  1 = finished, but errors, 2 = finisheed no errors
   */
  public setAppReady(_ready: number): void {
    this.isAppReady = _ready;
  }

  public isBeanconqurorAppReady(): Promise<any> {
    const promise = new Promise((resolve, reject) => {

      if (this.isAppReady === 1 || this.isAppReady === 2) {
        this.uiLog.log('Check app ready - Already loaded, no interval needed');
        resolve();
      } else {
        const intV = setInterval(() => {
          this.uiLog.log('Check app ready');
          if (this.isAppReady === 1 || this.isAppReady === 2) {
            resolve();
            clearInterval(intV);
          }
        }, 50);
      }

    });

    return promise;
  }

  public convertToNumber(event: any): number {
    let eventInput:any = event;
    if (eventInput === '') {
      return eventInput;
    }
    if (eventInput.indexOf(',')) {
      eventInput =  eventInput.replace(/,/g, '.');
    }

    return parseFloat(eventInput);
  }

  public openExternalWebpage(_url: string) {
    let url:string = _url;
    if (url.indexOf('http') === -1) {
      // Saftey
      url = 'http://' + url;
    }

    this.inAppBrowser.create(url, '_system');

   // window.open(_url, "_system");

  }

  public sanitizeImagePath (imagePath: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(imagePath);
  }

  public getBase64Data (imagePath: string) {
    return this.uiFileHelper.getBase64File(imagePath);
  }


  public async exportJSON (fileName: string, jsonContent: string): Promise<any> {
     const promise = new Promise((resolve, reject) => {
      const errorCallback = (e) => {
        // console.log('Error: ' + e);
        reject();
      };

      // Fixed umlaut issue
      // Thanks to: https://stackoverflow.com/questions/31959487/utf-8-encoidng-issue-when-exporting-csv-file-javascript
      const blob = new Blob([jsonContent], {type: 'application/json;charset=UTF-8;'});
      if (this.platform.is('android') || this.platform.is('ios')) {
        let storageLocation: string = '';

        switch (device.platform) {

          case 'Android':
            storageLocation = cordova.file.externalRootDirectory;
            break;
          case 'iOS':
            storageLocation = cordova.file.documentsDirectory;
            break;

        }


        window.resolveLocalFileSystemURL(storageLocation,
           (fileSystem)  => {

            fileSystem.getDirectory('Download', {
                create: true,
                exclusive: false
              },
               (directory) => {
                 directory.getDirectory('Beanconqueror_export', {
                     create: true,
                     exclusive: false
                   },
                   (directory_export) => {
                     // You need to put the name you would like to use for the file here.
                     directory_export.getFile(fileName, {
                         create: true,
                         exclusive: false
                       },
                       (fileEntry) => {

                         fileEntry.createWriter((writer) => {
                           writer.onwriteend =  () => {
                             resolve(fileEntry);
                           };

                           writer.seek(0);
                           writer.write(blob); // You need to put the file, blob or base64 representation here.

                         }, errorCallback);
                       }, errorCallback);

                   }, errorCallback);



              }, errorCallback);
          }, errorCallback);
      } else {
        setTimeout(() => {
          if (navigator.msSaveBlob) { // IE 10+
            navigator.msSaveBlob(blob, fileName);
          } else {
            const link = document.createElement('a');
            if (link.download !== undefined) { // feature detection
              // Browsers that support HTML5 download attribute
              const url = URL.createObjectURL(blob);
              link.setAttribute('href', url);
              link.setAttribute('download', fileName);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              resolve(fileName);

            }
          }
        }, 250);
      }

    });
     return promise;
  }

}
