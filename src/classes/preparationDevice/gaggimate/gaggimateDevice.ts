import { HttpClient } from '@angular/common/http';

import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { padStart } from 'lodash';
import moment from 'moment';
import { stringify } from 'safe-stable-stringify';

import { IGaggimateParams } from '../../../interfaces/preparationDevices/gaggimate/iGaggimateParams';
import { IGaggimateShotNotes } from '../../../interfaces/preparationDevices/gaggimate/iGaggimateShotNotes';
import { UILog } from '../../../services/uiLog';
import { BrewFlow } from '../../brew/brewFlow';
import { Preparation } from '../../preparation/preparation';
import { PreparationDevice } from '../preparationDevice';
import { GaggimateParser } from './gaggimateParser';

declare var cordova;

export class GaggimateDevice extends PreparationDevice {
  private parser = new GaggimateParser();
  private connectionURL: string;
  private _isConnected = false;

  constructor(
    protected httpClient: HttpClient,
    _preparation: Preparation,
  ) {
    super(httpClient, _preparation);

    this.connectionURL = this.getPreparation().connectedPreparationDevice.url;

    if (typeof cordova !== 'undefined') {
      //
    }
  }

  public isConnected() {
    return this._isConnected;
  }

  private isNonEmptyJsonObject(
    value: unknown,
  ): value is Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== null && proto !== Object.prototype) {
      return false;
    }
    return Object.keys(value).length > 0;
  }

  async deviceConnected(): Promise<boolean> {
    try {
      const options = {
        url: this.connectionURL + '/api/status',
        connectTimeout: 5000,
      };
      const response: HttpResponse = await CapacitorHttp.get(options);
      if (
        response?.status === 200 &&
        this.isNonEmptyJsonObject(response?.data)
      ) {
        return true;
      } else {
        throw new Error('Invalid connection response');
      }
    } catch (error) {
      this.logError('Error in connection:', error);
      throw error;
    }
  }

  public static returnBrewFlowForShotData(samples) {
    const brewFlow = new BrewFlow();
    const newMoment = moment(new Date()).startOf('day');

    samples.forEach((row) => {
      const shotEntryTime = newMoment.clone().add(row.t, 'millisecond');
      const timestamp = shotEntryTime.format('HH:mm:ss.SSS');

      brewFlow.weight.push({
        timestamp: timestamp,
        brew_time: '',
        actual_weight: row.v ?? row.ev ?? 0,
        old_weight: 0,
        actual_smoothed_weight: 0,
        old_smoothed_weight: 0,
        calculated_real_flow: 0,
        not_mutated_weight: 0,
      });

      brewFlow.pressureFlow.push({
        actual_pressure: row.cp ?? 0,
        old_pressure: 0,
        brew_time: '',
        timestamp: timestamp,
      });

      brewFlow.waterFlow.push({
        value: row.fl ?? 0,
        brew_time: '',
        timestamp: timestamp,
      });

      brewFlow.temperatureFlow.push({
        actual_temperature: row.ct ?? 0,
        old_temperature: 0,
        brew_time: '',
        timestamp: timestamp,
      });
    });
    return brewFlow;
  }

  public async getRecentShots() {
    try {
      const response = await fetch(
        this.connectionURL + '/api/history/recent.bin',
      );

      const buffer = await response.arrayBuffer();
      if (response.status === 404) {
        return null;
      }

      const indexData = this.parser.parseBinaryIndex(buffer);
      if (!indexData) {
        return null;
      }
      return JSON.stringify(this.parser.indexToShotList(indexData));
    } catch (error) {
      this.logError('Error in getRecentShots():', error);
      return null;
    }
  }

  public async getShotNotesFile(id: number) {
    const response = await fetch(
      this.connectionURL + `/api/history/${String(id)}.json`,
    );
    if (response.status === 404) {
      return {};
    }
    return (await response.json()) as GaggimateShotNotes;
  }

  public async getShotSlog(id: number) {
    const response = await fetch(
      this.connectionURL + `/api/history/${padStart(String(id), 6, '0')}.slog`,
    );

    const buffer = await response.arrayBuffer();
    if (response.status === 404) {
      return null;
    }
    return this.parser.parseBinaryShot(buffer, id);
  }

  private logError(...args: any[]) {
    UILog.getInstance().error('Gaggimate device:', ...args);
  }

  public getLatestShotsToImport(): number {
    const customParams = this.getPreparation()?.connectedPreparationDevice
      ?.customParams as GaggimateParams;
    return customParams?.latestShotsToImport
      ? customParams.latestShotsToImport
      : 3;
  }
}

export class GaggimateShotNotes implements IGaggimateShotNotes {
  public grindSetting?: string;
  public doseIn?: number;
  public notes?: string;
  public beanType?: string;
}

export class GaggimateParams implements IGaggimateParams {
  public chosenProfileId: string;
  public chosenProfileName: string;
  public shotId: number;
  public latestShotsToImport: number;

  constructor() {
    this.chosenProfileId = '';
    this.chosenProfileName = '';
    this.shotId = 0;
    this.latestShotsToImport = 1;
  }
}
