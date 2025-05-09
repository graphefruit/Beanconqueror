import { PreparationDevice } from '../preparationDevice';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Preparation } from '../../preparation/preparation';
import { MeticulousShotData } from './meticulousShotData';
import Api, { ActionType, ProfileIdent } from '@meticulous-home/espresso-api';

import { IMeticulousParams } from '../../../interfaces/preparationDevices/meticulous/iMeticulousParams';
import { Profile } from 'meticulous-typescript-profile';
import { catchError, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import { HistoryListingEntry } from '@meticulous-home/espresso-api/dist/types';
import moment from 'moment';
import {
  BrewFlow,
  IBrewPressureFlow,
  IBrewRealtimeWaterFlow,
  IBrewTemperatureFlow,
  IBrewWeightFlow,
} from '../../brew/brewFlow';

declare var cordova;
declare var io;

export class MeticulousDevice extends PreparationDevice {
  private socket: any = undefined;
  private meticulousShotData: MeticulousShotData = undefined;
  private _isConnected: boolean = false;
  private metApi: Api = undefined;

  private _profiles: Array<ProfileIdent> = [];

  private serverURL: string = '';

  public static returnBrewFlowForShotData(_shotData) {
    const newMoment = moment(new Date()).startOf('day');
    const newBrewFlow = new BrewFlow();

    for (const entry of _shotData as any) {
      const shotEntry: any = entry.shot;
      const shotEntryTime = newMoment.clone().add('milliseconds', entry.time);
      const timestamp = shotEntryTime.format('HH:mm:ss.SSS');

      const realtimeWaterFlow: IBrewRealtimeWaterFlow =
        {} as IBrewRealtimeWaterFlow;

      realtimeWaterFlow.brew_time = '';
      realtimeWaterFlow.timestamp = timestamp;
      realtimeWaterFlow.smoothed_weight = 0;
      realtimeWaterFlow.flow_value = shotEntry.gravimetric_flow;
      realtimeWaterFlow.timestampdelta = 0;

      newBrewFlow.realtimeFlow.push(realtimeWaterFlow);

      const brewFlow: IBrewWeightFlow = {} as IBrewWeightFlow;
      brewFlow.timestamp = timestamp;
      brewFlow.brew_time = '';
      brewFlow.actual_weight = shotEntry.weight;
      brewFlow.old_weight = 0;
      brewFlow.actual_smoothed_weight = 0;
      brewFlow.old_smoothed_weight = 0;
      brewFlow.not_mutated_weight = 0;
      newBrewFlow.weight.push(brewFlow);

      const pressureFlow: IBrewPressureFlow = {} as IBrewPressureFlow;
      pressureFlow.timestamp = timestamp;
      pressureFlow.brew_time = '';
      pressureFlow.actual_pressure = shotEntry.pressure;
      pressureFlow.old_pressure = 0;
      newBrewFlow.pressureFlow.push(pressureFlow);

      /**const temperatureFlow: IBrewTemperatureFlow = {} as IBrewTemperatureFlow;
      temperatureFlow.timestamp = timestamp;
      temperatureFlow.brew_time = '';
      temperatureFlow.actual_temperature = shotEntry.temperature;
      temperatureFlow.old_temperature = 0;
      newBrewFlow.temperatureFlow.push(temperatureFlow);**/
    }
    return newBrewFlow;
  }

  constructor(
    protected httpClient: HttpClient,
    _preparation: Preparation,
  ) {
    super(httpClient, _preparation);
    this.meticulousShotData = undefined;
    this.metApi = new Api(
      undefined,
      _preparation.connectedPreparationDevice.url,
    );
    this.serverURL = _preparation.connectedPreparationDevice.url;

    if (typeof cordova !== 'undefined') {
    }
  }
  public getHistory() {
    const promise = new Promise<any>((resolve, reject) => {
      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
        }),
      };
      this.httpClient
        .post(
          this.serverURL + '/api/v1/history',
          {
            sort: 'desc',
            max_results: 20,
          },
          httpOptions,
        )
        .pipe(
          timeout(10000),
          catchError((e) => {
            return of(null);
          }),
        )
        .toPromise()
        .then(
          (data: any) => {
            console.log(data);
            if (data && data.history) {
              resolve(data.history);
            }
          },
          (error) => {
            console.log(error);
            reject();
          },
        )
        .catch((error) => {
          console.log(error);
          reject();
        });
    });
    return promise;
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

      const profile = profileResponse.data as unknown as Profile;
      return profile;
      /*  if (profileResponse instanceof Profile) {
      } else {

      }*/
    } catch (ex) {}
    return undefined;
  }

  public async getHistoryShortListing() {
    const response = await this.metApi.getHistoryShortListing();
    if (response && response.data && response.data.history) {
      return response.data.history as Array<HistoryListingEntry>;
    }
  }

  public async searchHistory() {
    const response = await this.metApi.searchHistory({
      query: '',
      ids: [],
      start_date: '',
      end_date: '',
      order_by: ['date'],
      sort: 'desc',
      max_results: 10,
      dump_data: true,
    });
    if (response && response.data && response.data.history) {
      return response.data.history as Array<HistoryListingEntry>;
    }
  }

  public async loadProfileByID(_profileId: string) {
    try {
      const loadProfile = await this.metApi.loadProfileByID(_profileId);
      const profile = loadProfile.data as unknown as Profile;
      return profile;
    } catch (ex) {
      console.log(ex.message);
    }
    return undefined;
  }

  public async startExecute() {
    try {
      const action: ActionType = 'start';
      const execute = await this.metApi.executeAction(action);
    } catch (ex) {}
  }

  public async tareScale() {
    try {
      const action: ActionType = 'tare';
      const tareResponse = await this.metApi.executeAction(action);
    } catch (ex) {}
  }

  public async loadProfiles() {
    try {
      if (this._profiles.length <= 0) {
        const profiles = await this.metApi.listProfiles();
        this._profiles = profiles.data as Array<ProfileIdent>;
      }
    } catch (ex) {}
  }

  public isConnected() {
    return this._isConnected;
  }

  public override async deviceConnected(): Promise<boolean> {
    const promise = new Promise<boolean>(async (resolve, reject) => {
      const settings: any = await this.metApi.getSettings();
      if (settings?.data?.config) {
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

  /** public getTemperature() {
    return this.meticulousShotData.temperature;
  }**/

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
          extracting: data.extracting,
        };

        if (this.meticulousShotData === undefined) {
          const currentShotData = new MeticulousShotData();
          currentShotData.flow = data.sensors.f;
          currentShotData.status = data.name;
          currentShotData.weight = data.sensors.w;
          currentShotData.pressure = data.sensors.p;
          currentShotData.shotTime = data.time;
          //currentShotData.temperature = data.sensors.t;
          currentShotData.extracting = data.extracting;

          this.meticulousShotData = currentShotData;
        } else {
          this.meticulousShotData.flow = data.sensors.f;
          this.meticulousShotData.status = data.name;
          this.meticulousShotData.setWeight(data.sensors.w);
          this.meticulousShotData.pressure = data.sensors.p;
          this.meticulousShotData.shotTime = data.time;
          //this.meticulousShotData.temperature = data.sensors.t;
          this.meticulousShotData.extracting = data.extracting;
        }
      });
    });
    return promise;
  }
}

export class MeticulousParams implements IMeticulousParams {
  public chosenProfileId: string;
  constructor() {
    this.chosenProfileId = '';
  }
}
