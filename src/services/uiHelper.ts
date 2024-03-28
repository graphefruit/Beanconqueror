/** Core */
import { Injectable } from '@angular/core';
import { InAppBrowser } from '@awesome-cordova-plugins/in-app-browser/ngx';
/** Ionic */
import { Platform } from '@ionic/angular';
/** Third party */
import moment from 'moment';
// tslint:disable-next-line
import 'moment/locale/de';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { File, FileEntry } from '@awesome-cordova-plugins/file/ngx';
import { UIFileHelper } from './uiFileHelper';
import { UILog } from './uiLog';
import { UIAlert } from './uiAlert';

declare var cordova: any;
declare var device: any;
declare var window: any;
import { cloneDeep } from 'lodash';
import { UIToast } from './uiToast';
import { UISettingsStorage } from './uiSettingsStorage';
/**
 * Handles every helping functionalities
 */
@Injectable({
  providedIn: 'root',
})
export class UIHelper {
  /**
   *
   */
  private isAppReady: number = -1;

  constructor(
    private readonly platform: Platform,
    private readonly inAppBrowser: InAppBrowser,
    private readonly sanitizer: DomSanitizer,
    private readonly file: File,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiLog: UILog,
    private readonly uiAlert: UIAlert,
    private readonly uiToast: UIToast
  ) {}

  public static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      // tslint:disable
      const r =
          ((crypto.getRandomValues(new Uint8Array(1))[0] / Math.pow(2, 8)) *
            16) |
          0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  public static jsonToArray = function (json) {
    const str = JSON.stringify(json, null, 0);
    const ret = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      ret[i] = str.charCodeAt(i);
    }
    return ret;
  };

  public static getUnixTimestamp(): number {
    return moment().unix();
  }

  /**
   * Clone without any reference
   * @param _value
   */
  public cloneData(_value) {
    const clone = cloneDeep(_value);
    return clone;
  }

  private getSettingsStorageInstance(): UISettingsStorage {
    let uiSettingsStorage: UISettingsStorage;
    uiSettingsStorage = UISettingsStorage.getInstance();

    return uiSettingsStorage;
  }

  /**
   * Copy (references may exist)
   * @param _value
   */
  public copyData(_value: any): any {
    if (_value) {
      if (_value.constructor === Array) {
        return { ...[], ..._value };
      }

      return { ..._value };
    }
    return undefined;
  }

  public copyToClipboard(_text: string) {
    try {
      window.cordova.plugins.clipboard.copy(
        _text,
        () => {
          this.uiToast.showInfoToastBottom('COPIED_TO_CLIPBOARD_SUCCESSFULLY');
        },
        () => {
          this.uiToast.showInfoToastBottom(
            'COPIED_TO_CLIPBOARD_UNSUCCESSFULLY'
          );
        }
      );
    } catch (ex) {}
  }

  public generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      // tslint:disable
      const r =
          ((crypto.getRandomValues(new Uint8Array(1))[0] / Math.pow(2, 8)) *
            16) |
          0,
        v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  public showAlert(_message, _title?: string) {
    this.uiAlert.showMessage(_message, _title);
  }
  public getUnixTimestamp(): number {
    return moment().unix();
  }

  public isToday(_unix: number): boolean {
    return moment.unix(moment().unix()).isSame(moment.unix(_unix), 'd');
  }

  public formateDatestr(_unix: string, _format?: string): string {
    let format: string =
      this.getSettingsStorageInstance().getSettings().date_format +
      ', HH:mm:ss';
    if (_format) {
      format = _format;
    }
    return moment(_unix).format(format);
  }

  public toFixedIfNecessary(value, dp) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return 0;
    }
    return +parsedFloat.toFixed(dp);
  }

  public encode(arrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  }

  public decode(str) {
    const asciiString = atob(str);
    return new Uint8Array([...asciiString].map((char) => char.charCodeAt(0)));
  }

  public formateDate(_unix: number, _format?: string): string {
    let format: string =
      this.getSettingsStorageInstance().getSettings().date_format +
      ', HH:mm:ss';
    if (_format) {
      format = _format;
    }

    return moment.unix(_unix).format(format);
  }

  public formatSeconds(_seconds, _format) {
    try {
      return moment().startOf('day').add('seconds', _seconds).format(_format);
    } catch (ex) {
      return 0;
    }
  }
  public formatSecondsAndMilliseconds(_seconds, _milliseconds, _format) {
    try {
      return moment()
        .startOf('day')
        .add('seconds', _seconds)
        .add('milliseconds', _milliseconds)
        .format(_format);
    } catch (ex) {
      return 0;
    }
  }
  public getActualTimeWithMilliseconds() {
    return moment(new Date()).format('HH:mm:ss.SSS');
  }

  public timeDifference(_unix: number): any {
    const now = moment.unix(this.getUnixTimestamp());
    const toDiff = moment(moment.unix(_unix));
    const timeDifference = {
      MILLISECONDS: 0,
      SECONDS: 0,
      MINUTES: 0,
      HOURS: 0,
      DAYS: 0,
    };

    timeDifference.MILLISECONDS = now.diff(toDiff, 'milliseconds');
    timeDifference.SECONDS = now.diff(toDiff, 'seconds');
    timeDifference.MINUTES = now.diff(toDiff, 'minutes');
    timeDifference.HOURS = now.diff(toDiff, 'hours');
    timeDifference.DAYS = now.diff(toDiff, 'days');
    return timeDifference;
  }

  public async attachOnPlatformReady(): Promise<any> {
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
        resolve(undefined);
      } else {
        const intV = setInterval(() => {
          this.uiLog.log('Check app ready');
          if (this.isAppReady === 1 || this.isAppReady === 2) {
            resolve(undefined);
            clearInterval(intV);
          }
        }, 50);
      }
    });

    return promise;
  }

  public convertToNumber(event: any): number {
    let eventInput: any = event;
    if (eventInput === '') {
      return eventInput;
    }
    if (eventInput.indexOf(',')) {
      eventInput = eventInput.replace(/,/g, '.');
    }

    return parseFloat(eventInput);
  }

  public openExternalWebpage(_url: string) {
    let url: string = _url;
    if (url.indexOf('http') === -1) {
      // Saftey
      url = 'http://' + url;
    }

    this.inAppBrowser.create(url, '_system');

    // window.open(_url, "_system");
  }

  public sanitizeImagePath(imagePath: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(imagePath);
  }

  public getBase64Data(imagePath: string) {
    return this.uiFileHelper.getBase64File(imagePath);
  }

  public async exportJSON(
    fileName: string,
    jsonContent: string,
    _share: boolean = false
  ): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      // Fixed umlaut issue
      // Thanks to: https://stackoverflow.com/questions/31959487/utf-8-encoidng-issue-when-exporting-csv-file-javascript
      const blob = new Blob([jsonContent], {
        type: 'application/json;charset=UTF-8;',
      });
      try {
        const file: FileEntry = await this.uiFileHelper.downloadFile(
          fileName,
          blob,
          _share
        );
        resolve(file);
      } catch (ex) {
        reject();
      }
    });
    return promise;
  }
}
