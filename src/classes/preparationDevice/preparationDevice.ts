import { HttpClient } from '@angular/common/http';

import type { Brew } from '../brew/brew';
import { Logger } from '../devices/common/logger';
import { Preparation } from '../preparation/preparation';
import type { Settings } from '../settings/settings';

export class PreparationDevice {
  protected blueToothParentlogger: Logger;

  private preparation: Preparation;

  private http: HttpClient;

  protected temperature: number;
  protected pressure: number;
  protected deviceTemperature: number;

  constructor(
    protected _http: HttpClient,
    _preparation: Preparation,
  ) {
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
  public async turnOnMachine() {
    return false;
  }
  public async turnOffMachine() {
    return false;
  }

  /**
   * Syncs a brew back to the machine after it was added or edited. Machines
   * which support this override it and decide on their own whether there is
   * something to do for the given brew.
   *
   * Must never throw. Returns the translation key of a message which shall be
   * shown to the user, or undefined if there is nothing to tell.
   */
  public async syncBrew(
    _brew: Brew,
    _settings: Settings,
  ): Promise<string | undefined> {
    return undefined;
  }
}
