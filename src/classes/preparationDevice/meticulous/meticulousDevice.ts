import { PreparationDevice } from '../preparationDevice';
import { HttpClient } from '@angular/common/http';
import { Preparation } from '../../preparation/preparation';
import { MeticulousShotData } from './meticulousShotData';

declare var cordova;
declare var io;
export class MeticulousDevice extends PreparationDevice {
  private socket: any = undefined;
  private meticulousShotData: MeticulousShotData = undefined;
  private _isConnected: boolean = false;
  constructor(protected httpClient: HttpClient, _preparation: Preparation) {
    super(httpClient, _preparation);
    this.meticulousShotData = new MeticulousShotData();

    if (typeof cordova !== 'undefined') {
    }
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
        const currentShotData = new MeticulousShotData();
        currentShotData.flow = data.sensors.f;
        currentShotData.status = data.name;
        currentShotData.weight = data.sensors.w;
        currentShotData.pressure = data.sensors.p;
        currentShotData.shotTime = data.time;
        this.meticulousShotData = currentShotData;

        console.log(update);
      });
    });
    return promise;
  }
}
