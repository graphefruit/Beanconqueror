import { HttpClient } from '@angular/common/http';

import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { padStart } from 'lodash';
import moment from 'moment';

import { IGaggimateParams } from '../../../interfaces/preparationDevices/gaggimate/iGaggimateParams';
import { IGaggimateShotNotes } from '../../../interfaces/preparationDevices/gaggimate/iGaggimateShotNotes';
import { UILog } from '../../../services/uiLog';
import type { Brew } from '../../brew/brew';
import { BrewFlow } from '../../brew/brewFlow';
import { Preparation } from '../../preparation/preparation';
import type { Settings } from '../../settings/settings';
import { PreparationDeviceType } from '../index';
import { PreparationDevice } from '../preparationDevice';
import { GaggimateParser } from './gaggimateParser';
import { GaggimateStatus, GaggimateWsService } from './gaggimateWsService';

declare var cordova;

export class GaggimateDevice extends PreparationDevice {
  private DO_DEBUG = true;
  private SOCKET_POST_MODE_SETTLE_MS = 1500;

  private parser = new GaggimateParser();
  private gaggimateSocket = new GaggimateWsService({
    debug: this.DO_DEBUG,
    timeout: 5000,
  });
  private connectionURL: string;
  private connectionToWsURL: string;
  private _isConnected = false;

  private _profiles = [];

  public MODE_BREW = 1;

  constructor(
    protected httpClient: HttpClient,
    _preparation: Preparation,
  ) {
    super(httpClient, _preparation);

    this.connectionURL = this.getPreparation().connectedPreparationDevice.url;
    this.connectionToWsURL = this.getPreparation()
      .connectedPreparationDevice.url.replace(/^http/, 'ws')
      .concat('/ws');

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

  public getProfiles() {
    return this._profiles;
  }

  public async cancelConfirmation() {
    try {
      this.gaggimateSocket.send({
        tp: 'req:brew:confirm:cancel',
      });

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.offCancelWarning(listenerId);
          reject(new Error('Warning cancel timed out'));
        }, 5000);

        const listenerId = this.onCancelWarning((isWarning) => {
          if (!isWarning) {
            clearTimeout(timeout);
            this.offCancelWarning(listenerId);
            resolve();
          }
        });
      });

      return true;
    } catch (ex) {
      // TODO
    }
    return undefined;
  }

  public async loadProfiles() {
    try {
      if (this._profiles.length <= 0) {
        const profiles = await this.gaggimateSocket.request({
          tp: 'req:profiles:list',
          minimal: true,
        });
        this._profiles = profiles.profiles;
      }
    } catch (ex) {
      this.logError('Error in loadProfiles:', ex);
    }
  }

  public async selectBrewMode() {
    try {
      // Send the command
      this.gaggimateSocket.send({
        tp: 'req:change-mode',
        mode: this.MODE_BREW,
      });

      // Wait for evt:status confirming the new mode
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.offStatusUpdate(listenerId);
          reject(new Error('Brew mode selection confirmation timed out'));
        }, 5000);

        const listenerId = this.onStatusUpdate((status) => {
          if (status.mode === this.MODE_BREW) {
            clearTimeout(timeout);
            this.offStatusUpdate(listenerId);
            resolve();
          }
        });
      });

      return true;
    } catch (ex) {
      // TODO
    }
    return undefined;
  }

  public async startExtraction(ignoreWarnings = false) {
    if (this.gaggimateSocket.machineState.isBrewing) {
      return undefined;
    }

    this.clearHistory(); // needed to clean the machine history if the shot is restarted without closing the socket (e.g. reset timer and re-run)

    // If the machine is still in the finished state for any reason, clear the extraction
    if (
      this.gaggimateSocket.machineState.status.process?.l?.toLowerCase() ===
      'finished'
    ) {
      this.clearExtraction();
    }

    try {
      this.gaggimateSocket.send({
        tp: 'req:process:activate',
        ignoreWarnings: ignoreWarnings,
      });
      return true;
    } catch (ex) {
      this.logError('Error in startExecute:', ex);
    }
    return undefined;
  }

  public stopExtraction() {
    if (!this.gaggimateSocket.machineState.isBrewing) {
      return undefined;
    }

    try {
      this.gaggimateSocket.send({
        tp: 'req:process:deactivate',
      });
      return true;
    } catch (ex) {
      this.logError('Error in stopShot:', ex);
    }
    return undefined;
  }

  public clearExtraction() {
    if (this.gaggimateSocket.machineState.isBrewing) {
      return undefined;
    }

    try {
      this.gaggimateSocket.clear();
      return true;
    } catch (ex) {
      this.logError('Error in clear:', ex);
    }
    return undefined;
  }

  public clearHistory() {
    this.gaggimateSocket.clearHistory();
  }

  public stopRecordingHistory() {
    this.gaggimateSocket.stopRecordingHistory();
  }

  public async selectProfileByID(_profileId: string) {
    try {
      // Send the command
      await this.gaggimateSocket.request({
        tp: 'req:profiles:select',
        id: _profileId,
      });

      // Wait for evt:status confirming the new profile
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.offStatusUpdate(listenerId);
          reject(new Error('Profile selection confirmation timed out'));
        }, 5000);

        const listenerId = this.onStatusUpdate((status) => {
          if (status.selectedProfileId === _profileId) {
            clearTimeout(timeout);
            this.offStatusUpdate(listenerId);
            resolve();
          }
        });
      });

      return true;
    } catch (ex) {
      // TODO
    }
    return undefined;
  }

  /**
   * Switches the GaggiMate to brew mode and selects the given profile, if this
   * is not already the case. Only called when the user actively chooses a
   * profile, so just opening a brew does not wake up the machine.
   */
  public async activateOnProfile(_profileId: string): Promise<boolean> {
    if (!_profileId) {
      return false;
    }
    const status = this.getActualShotData();
    if (status?.mode !== this.MODE_BREW && !(await this.selectBrewMode())) {
      return false;
    }
    if (
      this.getActualShotData()?.selectedProfileId !== _profileId &&
      !(await this.selectProfileByID(_profileId))
    ) {
      return false;
    }
    return true;
  }

  /** True if the machine is in brew mode with the given profile selected */
  public isActiveOnProfile(_profileId: string): boolean {
    const status = this.getActualShotData();
    return (
      !!_profileId &&
      status?.mode === this.MODE_BREW &&
      status?.selectedProfileId === _profileId
    );
  }

  public getTargetTemperature(): number {
    return (
      Math.round((this.getActualShotData()?.targetTemperature ?? 0) * 10) / 10
    );
  }

  /**
   * The brew target of the selected profile: the target weight if the profile
   * stops by weight and a scale is available, otherwise the total duration.
   */
  public isBrewTargetWeight(): boolean {
    return !!this.getActualShotData()?.brewTarget;
  }

  public getBrewTarget(): number {
    const status = this.getActualShotData();
    const target = this.isBrewTargetWeight()
      ? status?.targetWeight
      : status?.brewTargetDuration;
    return Math.round((target ?? 0) * 10) / 10;
  }

  /**
   * GaggiMate only supports changing the target temperature (1 °C) and the
   * brew target (1 g or 1 s) step by step, like the buttons on its display.
   * The change is applied to the selected profile until it is selected again.
   */
  public changeTargetTemperature(_raise: boolean) {
    try {
      this.gaggimateSocket.send({
        tp: _raise ? 'req:raise-temp' : 'req:lower-temp',
      });
    } catch (ex) {
      this.logError('Error in changeTargetTemperature:', ex);
    }
  }

  public changeBrewTarget(_raise: boolean) {
    try {
      this.gaggimateSocket.send({
        tp: _raise ? 'req:raise-brew-target' : 'req:lower-brew-target',
      });
    } catch (ex) {
      this.logError('Error in changeBrewTarget:', ex);
    }
  }

  public static returnBrewFlowForShotData(samples, version: number) {
    const brewFlow = new BrewFlow();
    const newMoment = moment(new Date()).startOf('day');
    let previousEventTime = 0;
    let lastValidWp = 0;
    let oldWaterDispensed = 0;

    samples.forEach((row) => {
      const shotEntryTime = newMoment.clone().add(row.t, 'millisecond');
      const timestamp = shotEntryTime.format('HH:mm:ss.SSS');

      brewFlow.pressureFlow.push({
        actual_pressure: row.cp ?? 0,
        old_pressure: 0,
        brew_time: '',
        timestamp: timestamp,
      });

      brewFlow.temperatureFlow.push({
        actual_temperature: row.ct ?? 0,
        old_temperature: 0,
        brew_time: '',
        timestamp: timestamp,
      });

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

      // vf is the weight based flow (g/s) measured by the scale or estimated from puck flow
      brewFlow.realtimeFlow.push({
        flow_value: row.vf ?? 0,
        brew_time: '',
        timestamp: timestamp,
        smoothed_weight: 0,
        timestampdelta: 0,
      });

      // Set the pump flow rate
      brewFlow.waterDispensedFlowSecond.push({
        actual: row.fl ?? 0,
        old: 0,
        brew_time: '',
        timestamp: timestamp,
      });

      // Cumulative water dispensed
      if (version < 7) {
        // Calculate the value for older shots
        const secondsDelta = (row.t - (previousEventTime || 0)) / 1000;
        brewFlow.waterDispensed.push({
          actual: (oldWaterDispensed || 0) + row.fl * secondsDelta,
          old: oldWaterDispensed || 0,
          brew_time: '',
          timestamp: timestamp,
        });

        oldWaterDispensed += row.fl * secondsDelta;
        previousEventTime = row.t;
      } else {
        // Workaround to fix wp value being reset to 0 before the shot ends
        let effectiveWp = row.wp ?? 0;
        if (effectiveWp < lastValidWp && lastValidWp > 0) {
          effectiveWp = lastValidWp + effectiveWp;
        } else if (effectiveWp > lastValidWp) {
          lastValidWp = effectiveWp;
        }

        brewFlow.waterDispensed.push({
          actual: effectiveWp,
          old: lastValidWp,
          brew_time: '',
          timestamp: timestamp,
        });
      }
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

  /**
   * Returns all shots of the GaggiMate from the complete shot index, most
   * recent first. In contrast to getRecentShots() this is not limited.
   */
  public async getAllShots(): Promise<any[]> {
    const response = await fetch(this.connectionURL + '/api/history/index.bin');
    if (response.status !== 200) {
      throw new Error('GaggiMate shot index is not available');
    }
    return this.parser.indexToShotList(
      this.parser.parseBinaryIndex(await response.arrayBuffer()),
    ) as any[];
  }

  public async getShotNotesFile(
    id: number,
  ): Promise<GaggimateShotNotes | Record<string, never>> {
    const paddedId = String(id).padStart(6, '0');
    const unpaddedId = String(id);

    // Search for both padded and unpadded file names, trying padded first, then fall back to unpadded
    const fileNames = [paddedId, unpaddedId];

    for (const fileName of fileNames) {
      try {
        const response = await fetch(
          `${this.connectionURL}/api/history/${fileName}.json`,
        );

        if (response.status === 404) {
          continue; // Try the next file name format in the list
        }

        if (!response.ok) {
          continue;
        }

        const notes = (await response.json()) as GaggimateShotNotes;
        // GaggiMate stores the dose as text ('18', or '' if not set)
        const doseIn = parseFloat(String(notes.doseIn ?? ''));
        notes.doseIn = isNaN(doseIn) ? undefined : doseIn;
        return notes;
      } catch (ex) {
        // If the unpadded attempt fails as well, log the error
        if (fileName === unpaddedId) {
          this.logError('Notes file missing: ', [id]);
        }
      }
    }
    return {};
  }

  public async getShotSlog(id: number) {
    const response = await fetch(
      this.connectionURL + `/api/history/${padStart(String(id), 6, '0')}.slog`,
    );

    const buffer = await response.arrayBuffer();
    if (response.status === 404) {
      return null;
    }
    try {
      return this.parser.parseBinaryShot(buffer, id);
    } catch (error) {
      this.logError('Error in getShotSlog():', error);
      return null;
    }
  }

  /**
   * Runs the given action on the websocket of this device. If the socket is not
   * open yet (e.g. when a brew is synced after it was saved), it is opened just
   * for this action and closed afterward.
   */
  private async withSocket<T>(action: () => Promise<T>): Promise<T> {
    const wasConnected = this.gaggimateSocket.isConnected;
    if (!wasConnected && !(await this.connectToSocket(5000))) {
      this.gaggimateSocket.disconnect();
      throw new Error('GaggiMate websocket connection failed');
    }
    try {
      return await action();
    } finally {
      if (!wasConnected) {
        this.disconnectSocket();
      }
    }
  }

  /**
   * Checks if the shot with the given id on the GaggiMate is still the one
   * which was imported. Shot ids are reused when the history on the GaggiMate
   * is reset (e.g. new sd card or reflashing), so the id alone is not enough
   * to identify a shot. The start timestamp of the shot needs to match aswell.
   */
  public async isSameShot(id: number, timestamp: number): Promise<boolean> {
    if (!id || !timestamp) {
      return false;
    }
    const response = await fetch(this.connectionURL + '/api/history/index.bin');
    if (response.status !== 200) {
      throw new Error('GaggiMate shot index is not available');
    }
    const indexData = this.parser.parseBinaryIndex(
      await response.arrayBuffer(),
    );
    const entry = indexData.entries.find(
      (e) => Number(e.id) === Number(id) && !e.deleted,
    );
    return entry !== undefined && entry.timestamp === timestamp;
  }

  /**
   * Adds the given values to the notes of a shot on the GaggiMate. Only fields
   * which are empty on the GaggiMate are filled, existing values are kept.
   * Returns true if something was written.
   */
  public async addMissingShotNotes(
    id: number,
    values: GaggimateShotNotes,
  ): Promise<boolean> {
    return this.withSocket(() => this.addMissingShotNotesOnSocket(id, values));
  }

  private async addMissingShotNotesOnSocket(
    id: number,
    values: GaggimateShotNotes,
  ): Promise<boolean> {
    const response = await this.gaggimateSocket.request({
      tp: 'req:history:notes:get',
      id: String(id),
    });
    if (response?.tp !== 'res:history:notes:get') {
      throw new Error('Unexpected response for the GaggiMate shot notes');
    }
    // The save request replaces the stored notes, so we need to send all of them
    const notes: Record<string, string | number> = {
      rating: 0,
      beanType: '',
      doseIn: '',
      doseOut: '',
      ratio: '',
      grindSetting: '',
      balanceTaste: 'balanced',
      notes: '',
      ...(response.notes ?? {}),
      id: String(id),
    };

    const isEmpty = (value: string | number | undefined | null) =>
      value === undefined ||
      value === null ||
      value === 0 ||
      String(value).trim() === '' ||
      String(value).trim() === '0';

    let changed = false;
    for (const key of Object.keys(values)) {
      if (isEmpty(notes[key]) && !isEmpty(values[key])) {
        // GaggiMate stores everything except the rating as text
        notes[key] = key === 'rating' ? values[key] : String(values[key]);
        changed = true;
      }
    }
    if (!changed) {
      return false;
    }

    const doseIn = parseFloat(String(notes.doseIn));
    const doseOut = parseFloat(String(notes.doseOut));
    if (isEmpty(notes.ratio) && doseIn > 0 && doseOut > 0) {
      notes.ratio = (doseOut / doseIn).toFixed(2);
    }

    const saveResponse = await this.gaggimateSocket.request({
      tp: 'req:history:notes:save',
      id: String(id),
      notes: notes,
    });
    if (saveResponse?.msg !== 'Ok') {
      throw new Error('GaggiMate did not confirm saving the shot notes');
    }
    return true;
  }

  private shallWriteBackNotes(): boolean {
    const customParams = this.getPreparation()?.connectedPreparationDevice
      ?.customParams as GaggimateParams;
    return customParams?.writeBackNotes === true;
  }

  /**
   * If the brew was imported from this GaggiMate and the user activated it,
   * the brew data is added to the shot notes on the GaggiMate. Only fields
   * which are empty there are filled.
   */
  public override async syncBrew(
    _brew: Brew,
    _settings: Settings,
  ): Promise<string | undefined> {
    try {
      const params = _brew?.preparationDeviceBrew?.params as GaggimateParams;
      // Only brews with an imported GaggiMate shot have a shot id
      if (
        _brew?.preparationDeviceBrew?.type !==
          PreparationDeviceType.GAGGIMATE ||
        !params?.shotId ||
        !this.shallWriteBackNotes()
      ) {
        this.logDebug('shot is missing id, skipping update');
        return undefined;
      }

      // Brews which were imported before the timestamp was stored can't be
      // verified, so we don't write to the GaggiMate for them
      if (!params.shotTimestamp) {
        this.logDebug('shot is missing timestamp, skipping update');
        return undefined;
      }
      // Make sure the shot id still belongs to the imported shot, else we
      // would write the data of this brew into the notes of a different shot
      if (!(await this.isSameShot(params.shotId, params.shotTimestamp))) {
        this.logDebug('shot is not the same, skipping update');
        return 'PREPARATION_DEVICE.TYPE_GAGGIMATE.WRITE_BACK_NOTES_SHOT_MISMATCH';
      }

      // Collect the values of the brew. Empty values are skipped later.
      const values = new GaggimateShotNotes();
      const maxRating = _settings?.brew_rating;
      if (_brew.rating > 0 && maxRating > 0) {
        // GaggiMate rates with 1-5 stars, 0 means not rated
        values.rating = Math.min(
          Math.max(Math.round((_brew.rating / maxRating) * 5), 1),
          5,
        );
      }
      if (_brew.grind_weight > 0) {
        values.doseIn = Number(_brew.grind_weight);
      }
      values.grindSetting = String(_brew.grind_size ?? '').trim();
      values.beanType = String(_brew.getBean()?.name ?? '').trim();
      values.notes = String(_brew.note ?? '').trim();

      const changed = await this.addMissingShotNotes(params.shotId, values);
      return changed
        ? 'PREPARATION_DEVICE.TYPE_GAGGIMATE.WRITE_BACK_NOTES_SUCCESS'
        : undefined;
    } catch (error) {
      // Most likely the machine is switched off or not reachable in this network
      this.logError('Error in syncBrew():', error);
      return 'PREPARATION_DEVICE.TYPE_GAGGIMATE.WRITE_BACK_NOTES_ERROR';
    }
  }

  private logError(...args: any[]) {
    UILog.getInstance().error('Gaggimate device:', ...args);
  }

  private logDebug(...args: any[]) {
    if (this.DO_DEBUG) {
      UILog.getInstance().debug('Gaggimate device:', ...args);
    }
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

  public getActualShotData() {
    return this.gaggimateSocket.machineState?.status;
  }

  public isActive() {
    return this.gaggimateSocket?.machineState?.isActive;
  }

  public isBrewing() {
    return this.gaggimateSocket.machineState?.isBrewing;
  }

  public setIsBrewing(isBrewing: boolean) {
    this.gaggimateSocket.machineState.isBrewing = isBrewing;
  }

  public isGMBrewByWeight() {
    return this.gaggimateSocket.machineState?.isGMBrewByWeight;
  }

  public isValid() {
    return this.gaggimateSocket?.machineState?.isValid;
  }

  public isWarning() {
    return this.gaggimateSocket.machineState?.isWarning;
  }

  public getShotHistory() {
    return this.gaggimateSocket.machineState?.history;
  }

  public async getSocketShotId(timeoutMs = 5000): Promise<number | string> {
    // If shotId is already stored and non-zero, resolve immediately
    if (this.gaggimateSocket.machineState?.shotId) {
      return this.gaggimateSocket.machineState.shotId;
    }

    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;
      let listenerId: string;

      const cleanup = () => {
        if (timer) clearTimeout(timer);
        if (listenerId)
          this.gaggimateSocket.off('evt:history-shot-saved', listenerId);
      };

      timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out waiting for Shot Id after ${timeoutMs}ms`));
      }, timeoutMs);

      listenerId = this.gaggimateSocket.on(
        'evt:history-shot-saved',
        (msg: any) => {
          const id = msg.id ?? this.gaggimateSocket.machineState?.shotId;
          if (id) {
            cleanup();
            resolve(Number(id));
          }
        },
      );
    });
  }

  public disconnectSocket() {
    this.gaggimateSocket.disconnect();
    this._isConnected = false;
  }

  public async connectToSocket(
    timeoutMs = this.SOCKET_POST_MODE_SETTLE_MS,
  ): Promise<boolean> {
    try {
      if (this.gaggimateSocket.isConnected) {
        this._isConnected = true;
        return true;
      }

      this.gaggimateSocket.connect(this.connectionToWsURL);

      const startTime = Date.now();
      while (Date.now() - startTime < timeoutMs) {
        if (this.gaggimateSocket.isConnected) {
          this._isConnected = true;
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this._isConnected = false;
      return false;
    } catch (ex) {
      this.logError('Error connecting to socket: ' + ex);
      this._isConnected = false;
      return false;
    }
  }

  public onStatusUpdate(callback: (status: GaggimateStatus) => void): string {
    // GaggimateApiService.on('evt:status', ...) receives the parsed message.
    // When evt:status arrives, GaggimateApiService._onStatus() has already updated machineState.status.
    return this.gaggimateSocket.on('evt:status', () => {
      callback(this.gaggimateSocket.machineState.status);
    });
  }

  public offStatusUpdate(listenerId: string): void {
    this.gaggimateSocket.off('evt:status', listenerId);
  }

  public onCancelWarning(callback: (isWarning: boolean) => void): string {
    return this.gaggimateSocket.on('evt:brew:confirm:cancel', () => {
      callback(this.gaggimateSocket.machineState.isWarning);
    });
  }

  public offCancelWarning(listenerId: string): void {
    this.gaggimateSocket.off('evt:brew:confirm:cancel', listenerId);
  }

  public onShowWarning(callback: (isWarning: boolean) => void): string {
    return this.gaggimateSocket.on('evt:brew:confirm', () => {
      callback(this.gaggimateSocket.machineState.isWarning);
    });
  }

  public offShowWarning(listenerId: string): void {
    this.gaggimateSocket.off('evt:brew:confirm', listenerId);
  }

  public onShotFinished(callback: () => void): string {
    return this.gaggimateSocket.on('evt:shot-finished-stats', () => {
      callback();
    });
  }

  public offShotFinished(listenerId: string): void {
    this.gaggimateSocket.off('evt:shot-finished-stats', listenerId);
  }
}

export class GaggimateShotNotes implements IGaggimateShotNotes {
  public rating?: number;
  public grindSetting?: string;
  public doseIn?: number;
  public notes?: string;
  public beanType?: string;
}

export class GaggimateParams implements IGaggimateParams {
  public static readonly SHOT_WATCHDOG_TIMEOUT = 5000;
  public static readonly SHOT_ID_TIMEOUT = 3000;
  public chosenProfileId: string;
  public chosenProfileName: string;
  public shotId: number;
  /**
   * Start time (unix seconds) of the imported shot. The shot id is just a
   * counter on the GaggiMate, which starts again when the history is reset.
   * Together with the timestamp we are able to check if an id still belongs
   * to the shot which was imported.
   */
  public shotTimestamp: number;
  public latestShotsToImport: number;
  public confirmDuplicateImport: boolean;
  public confirmBeanAdd: boolean;
  public useTargetTemperature: boolean;
  public writeBackNotes: boolean;
  public autoSetBloomTime: boolean;
  public shotIdTimeout: number;
  public shotWatchdogTimeout: number;

  constructor() {
    this.chosenProfileId = '';
    this.chosenProfileName = '';
    this.shotId = 0;
    this.shotTimestamp = 0;
    this.latestShotsToImport = 1;
    this.confirmDuplicateImport = true;
    this.confirmBeanAdd = true;
    this.useTargetTemperature = false;
    this.writeBackNotes = false;
    this.autoSetBloomTime = false;
    this.shotIdTimeout = GaggimateParams.SHOT_ID_TIMEOUT;
    this.shotWatchdogTimeout = GaggimateParams.SHOT_WATCHDOG_TIMEOUT;
  }
}
