import { Logger } from '../devices/common/logger';
import { HttpClient } from '@angular/common/http';
import { Preparation } from '../preparation/preparation';

export class PreparationDevice {
  protected blueToothParentlogger: Logger;

  private preparation: Preparation;

  private http: HttpClient;

  protected temperature: number;
  protected pressure: number;
  protected deviceTemperature: number;

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
