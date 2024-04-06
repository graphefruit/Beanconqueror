import { PreparationDevice } from '../preparationDevice';
import { HttpClient } from '@angular/common/http';
import { Preparation } from '../../preparation/preparation';
import { MeticulousShotData } from './meticulousShotData';
import Api, { ApiResponseError, ProfileIdent } from 'meticulous-api/dist/index';

import { IMeticulousParams } from '../../../interfaces/preparationDevices/meticulous/iMeticulousParams';
import { Profile } from 'meticulous-typescript-profile';

declare var cordova;
declare var io;

export class MeticulousDevice extends PreparationDevice {
  private socket: any = undefined;
  private meticulousShotData: MeticulousShotData = undefined;
  private _isConnected: boolean = false;
  private metApi: Api = undefined;

  private _profiles: Array<ProfileIdent> = [];

  constructor(protected httpClient: HttpClient, _preparation: Preparation) {
    super(httpClient, _preparation);
    this.meticulousShotData = undefined;
    this.metApi = new Api(_preparation.connectedPreparationDevice.url);

    if (typeof cordova !== 'undefined') {
    }
  }

  public getActualShotData() {
    return this.meticulousShotData;
  }
  public getProfiles() {
    return this._profiles;
  }

  public async getProfile(_profileId: string) {
    try {
      const profileResponse = await this.metApi.getProfile(_profileId);

      if (profileResponse instanceof ApiResponseError) {
      } else {
        const profile = profileResponse.data as unknown as Profile;
        return profile;
      }
    } catch (ex) {}
    return undefined;
  }
  public async loadProfile(_profile: Profile) {
    const profileResponse = await this.metApi.loadProfile(_profile);
  }

  public async getProfileAndSendToMachine(_profileId: string) {
    const profile: Profile = await this.getProfile(_profileId);
    if (profile !== undefined) {
      await this.loadProfile(profile);
    }
  }
  public async loadProfiles() {
    try {
      if (this._profiles.length <= 0) {
        const profiles = await this.metApi.listProfiles();

        if (profiles instanceof ApiResponseError) {
        } else {
          this._profiles = profiles.data as Array<ProfileIdent>;
        }
      }
    } catch (ex) {}
  }

  public isConnected() {
    return this._isConnected;
  }

  public override async deviceConnected(): Promise<boolean> {
    const promise = new Promise<boolean>((resolve, reject) => {
      if (this.socket !== undefined) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    return promise;
  }

  public getPressure() {
    return this.meticulousShotData.pressure;
  }

  public getTemperature() {
    return this.meticulousShotData.temperature;
  }

  public getWeight() {
    return this.meticulousShotData.weight;
  }

  public getFlow() {
    return this.meticulousShotData.flow;
  }

  public getStatus() {
    return this.meticulousShotData.status;
  }

  public disconnectSocket() {
    if (this.socket !== undefined) {
      this.socket.disconnect();
      this.socket = undefined;
    }
    this._isConnected = false;
  }

  public connectToSocket(): Promise<boolean> {
    const promise: Promise<boolean> = new Promise((resolve, reject) => {
      if (this.socket !== undefined) {
        resolve(true);
        return;
      }
      this.socket = io(this.getPreparation().connectedPreparationDevice.url);

      this.socket.on('connect', () => {
        if (this.socket.disconnected) {
          this.disconnectSocket();
        } else {
          this._isConnected = true;
          resolve(true);
        }
      });
      this.socket.on('connect_error', (err) => {
        resolve(false);
        this.disconnectSocket();
      });
      this.socket.on('status', (data) => {
        const update = {
          profile_name: data.profile,
          status: data.name,
          shot_time_ms: data.time,
          pressureSensor_pressure: data.sensors.p,
          flowSensor_flow: data.sensors.f,
          loadcell_weight: data.sensors.w,
          display_temp: data.sensors.t,
        };

        if (this.meticulousShotData === undefined) {
          const currentShotData = new MeticulousShotData();
          currentShotData.flow = data.sensors.f;
          currentShotData.status = data.name;
          currentShotData.weight = data.sensors.w;
          currentShotData.pressure = data.sensors.p;
          currentShotData.shotTime = data.time;
          currentShotData.temperature = data.sensors.t;

          this.meticulousShotData = currentShotData;
        } else {
          this.meticulousShotData.flow = data.sensors.f;
          this.meticulousShotData.status = data.name;
          this.meticulousShotData.setWeight(data.sensors.w);
          this.meticulousShotData.pressure = data.sensors.p;
          this.meticulousShotData.shotTime = data.time;
          this.meticulousShotData.temperature = data.sensors.t;
        }
      });
    });
    return promise;
  }
}

export class MeticulousParams implements IMeticulousParams {
  public chosenProfile: ProfileIdent;
  constructor() {}
}
