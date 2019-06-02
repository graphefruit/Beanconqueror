/** Core */
import { Injectable } from '@angular/core';
/** Third party */
declare var console;
@Injectable()
export class UILog {

  public disabled: boolean = true;

  constructor() {
    this.disabled = false;
  }

  public enable(): void {
    this.disabled = false;
  }
  public disable(): void {
    this.disabled = false;
  }

  public log(_message: string): void {
    if (this.disabled === false) {
      console.log(_message);
    }

  }

  public info(_message: string): void {
    if (this.disabled === false && console.info) {
      console.info(_message);
    }
  }

  public error(_message: string): void {
    if (this.disabled === false && console.error) {
      console.error(_message);
    }
  }

  public warn(_message: string): void {
    if (this.disabled === false && console.warn) {
      console.warn(_message);
    }
  }

}
