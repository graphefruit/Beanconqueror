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

      // vf is the weight based flow (g/s) measured by the scale
      brewFlow.realtimeFlow.push({
        flow_value: row.vf ?? 0,
        brew_time: '',
        timestamp: timestamp,
        smoothed_weight: 0,
        timestampdelta: 0,
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

      brewFlow.waterDispensed.push({
        actual: row.wp ?? 0,
        old: 0,
        brew_time: '',
        timestamp: timestamp,
      });
    });
    return brewFlow;
  }

  /**
   * Returns the target temperature of a shot. Profiles may change the target
   * per phase, so the value which was set for most of the samples is used.
   */
  public static returnTargetTemperatureForShotData(samples): number {
    const counts = new Map<number, number>();
    for (const row of samples ?? []) {
      if (row.tt > 0) {
        counts.set(row.tt, (counts.get(row.tt) ?? 0) + 1);
      }
    }
    let targetTemp = 0;
    let maxCount = 0;
    counts.forEach((count, temp) => {
      if (count > maxCount) {
        maxCount = count;
        targetTemp = temp;
      }
    });
    return targetTemp;
  }

  public async getRecentShots() {
    try {
      const response = await fetch(
        this.connectionURL + '/api/history/recent.bin?limit=10',
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
    try {
      return (await response.json()) as GaggimateShotNotes;
    } catch {
      // GaggiMate answers with its web UI (status 200) for shots without notes
      return {};
    }
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

  public get maxShotVersionSupported(): number {
    return this.parser.MAX_SHOT_VERSION_SUPPORTED;
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
  public confirmDuplicateImport: boolean;
  public confirmBeanAdd: boolean;
  public useTargetTemperature: boolean;

  constructor() {
    this.chosenProfileId = '';
    this.chosenProfileName = '';
    this.shotId = 0;
    this.latestShotsToImport = 1;
    this.confirmDuplicateImport = true;
    this.confirmBeanAdd = true;
    this.useTargetTemperature = false;
  }
}
