/**Core**/
import {Injectable} from '@angular/core';
/**Ionic**/
import {Platform} from 'ionic-angular';
/**Third party**/
import moment from 'moment';
import 'moment/locale/de';


/**
 * Handles every helping functionalities
 */
@Injectable()
export class UIHelper {


  constructor(private platform: Platform) {
    moment.locale('de');
  }

  public copyData(_value: any) {
    if (_value.constructor == Array) {
      return Object.assign([], _value);
    }
    else {
      return Object.assign({}, _value);
    }
  }

  public generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  public getUnixTimestamp(): number {
    return moment().unix();
  }

  public isToday(_unix:number): boolean {
    return moment.unix(moment().unix()).isSame(moment.unix(_unix), 'd');
  }
  public formateDate(_unix:number,_format?:string):string{

    let format:string = "DD.MM.YYYY, HH:mm:ss";
    if (_format){
      format = _format;

    }
    return moment.unix(_unix).format(format);
  }

  public timeDifference(_unix:number):any{
    let now = moment.unix(this.getUnixTimestamp())
    let toDiff = moment(moment.unix(_unix));
    let timeDifference = {
        "MILLISECONDS":0,
        "SECONDS":0,
        "MINUTES":0,
        "DAYS":0,
    };

    timeDifference.MILLISECONDS = now.diff(toDiff,'milliseconds');
    timeDifference.SECONDS = now.diff(toDiff,'seconds');
    timeDifference.MINUTES = now.diff(toDiff,'minutes');
    timeDifference.DAYS = now.diff(toDiff,'days');
return timeDifference;
  }


  public attachOnPlatformReady() {
    return this.platform.ready()
  }

  public openExternalWebpage(_url: string) {
    if (_url.indexOf("http") == -1) {
      //Saftey
      _url = "http://" + _url;
    }

    window.open(_url, "_system");

  }


}
