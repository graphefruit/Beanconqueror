/**Core**/
import {Injectable} from '@angular/core';
/**Third party**/
declare var console;
@Injectable()
export class UILog {

  disabled: boolean = true;

  constructor() {
    this.disabled = false;
  }

  public enable() {
    this.disabled = false;
  }
  public disable()
  {
    this.disabled = false;
  }

  public log(_message: string) {
    if (this.disabled == false) {
      console.log(_message);
    }

  }

  public info(_message: string) {
    if (this.disabled == false && console.info) {
      console.info(_message);
    }
  }

  public error(_message: string) {
    if (this.disabled == false && console.error) {
      console.error(_message);
    }
  }

  public warn(_message: string) {
    if (this.disabled == false && console.warn) {
      console.warn(_message);
    }
  }


}
