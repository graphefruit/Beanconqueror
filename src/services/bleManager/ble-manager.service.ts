import { Injectable } from '@angular/core';
import DecentScale from '../../classes/devices/decentScale';
import {BluetoothLE} from '@ionic-native/bluetooth-le/ngx';
import {Platform} from '@ionic/angular';
import {UILog} from '../uiLog';

declare var ble;
declare var window;
@Injectable({
  providedIn: 'root'
})
export class BleManagerService {
  public decentScale: DecentScale = null;
  public scales;
  public failed: boolean;
  public ready: boolean;
  constructor(private readonly bluetoothle: BluetoothLE, private readonly platform: Platform,
              private uiLog: UILog) {

    this.scales = [];
    this.failed = false;
    this.ready = true;
  }

  private async stopScanning() {
    await ble.stopScan(() => {

    },() => {

    });
  }

  public async scanDevices(): Promise<Array<any>> {

    if (this.platform.is('android')) {
    /**  await this.bluetoothle.requestPermission().then(() => {

      }).catch(() => {

      });
      await this.bluetoothle.requestLocation().then(() => {

      }).catch(() => {

      });**/
    }
    const bleEnabled: boolean = await this.isBleEnabled();
    if (bleEnabled === false) {
      alert("BLE not enabled");
    }

    return new Promise<Array<any>>((resolve, reject) => {
      const devices: Array<any> = [];

      let timeoutVar: any = null;
      const stopScanningAndResolve = async () => {
        await this.stopScanning();
        this.uiLog.log('Scales found ' + JSON.stringify(devices));
        resolve(devices);
      };
      ble.startScan([], async (device)=>  {
        devices.push(device);
        let deviceName = '';
        if (device && device.name && device.name !== '') {
          deviceName = device && device.name && device.name.toLowerCase();
        }
        if (deviceName.startsWith('decent')) {
          // We found all needed devices.
          clearTimeout(timeoutVar);
          timeoutVar = null;
          await stopScanningAndResolve();
        }

      }, () => {
        resolve(devices);
      });
      timeoutVar = setTimeout(async () => {
        await stopScanningAndResolve();
      },10000);
    });
  }

  public connectDevice(device: any): Promise<boolean> {
    return new Promise((resolve, reject) => {

      if (device && device.id) {
        ble.connect(device.id, (e) => {
          resolve(true);
          this.uiLog.log('Decent scale connected');
        }, () => {
          this.uiLog.log('Decent scale NOT connected');
          resolve(false);
        });
      }
    });
  }
  public disconnect(deviceId): Promise<boolean>{
    return new Promise<boolean>((resolve, reject) => {
      ble.disconnect(deviceId, () => {
        resolve(true);
      }, () => {
        resolve(false);
      });
    });
  }

  public async isBleEnabled(): Promise<boolean> {
   return new Promise((resolve, reject) => {
      ble.isEnabled(
        () => {
          resolve(true);
        },
        () => {
          resolve(false);
        }
      );
    });
  }

  public async findAndconnectDecentScale() {
    return new Promise<string>(async (resolve, reject) => {
      const devices: Array<any> = await this.scanDevices();
      let bleDecentScale: any = null;
      for (const device of devices) {

        if (device && device.name && device.name.toLowerCase().startsWith('decent')) {
          bleDecentScale = device;
          break;
        }
      }

      if (bleDecentScale !== null) {
        const deviceConnected: boolean = await this.connectDevice(bleDecentScale);
        if (deviceConnected) {
          this.decentScale = new DecentScale(bleDecentScale.id);
          window.larsBLE = this.decentScale;
          resolve(bleDecentScale.id);
        }
      } else {
        resolve('');
      }

    });
  }

  public getDecentScale() {
    return this.decentScale;
  }

  public async autoConnectDecentScale(deviceId: string) {
    if (this.platform.is('ios')) {
      //We just need to scan, then we can auto connect for iOS (lol)
      const devices: Array<any> = await this.scanDevices();
    }
    ble.autoConnect(deviceId, () => {
      this.decentScale = new DecentScale(deviceId);
      window.larsBLE = this.decentScale;
      this.uiLog.log('Connected successfully');
    }, () => {
      this.decentScale = null;
      this.uiLog.log('Disconnected successfully');
    });
  }

}
