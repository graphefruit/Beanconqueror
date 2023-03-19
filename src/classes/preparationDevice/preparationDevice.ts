import { Logger } from '../devices/common/logger';
import { HttpClient } from '@angular/common/http';
import { Preparation } from '../preparation/preparation';

export type TareEvent = undefined;

export class PreparationDevice {
  protected blueToothParentlogger: Logger;

  private preparation: Preparation;

  private http: HttpClient;

  constructor(protected _http: HttpClient, _preparation: Preparation) {
    this.blueToothParentlogger = new Logger();
    this.preparation = _preparation;
    this.http = _http;
  }

  public getPreparation(): Preparation {
    return this.preparation;
  }

  public async deviceConnected(): Promise<boolean> {
    return null;
  }
}
