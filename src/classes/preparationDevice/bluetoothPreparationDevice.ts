import { HttpClient } from '@angular/common/http';

import { Capacitor } from '@capacitor/core';

import { CoffeeBluetoothDevicesService } from '../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { sleep } from '../devices';
import { PeripheralData } from '../devices/ble.types';
import { Logger } from '../devices/common/logger';
import { Preparation } from '../preparation/preparation';
import { PreparationDevice } from './preparationDevice';

declare var ble: any;

/**
 * Base class for all Bluetooth-based preparation devices.
 *
 * Provides:
 *  - First-class `bluetoothId` / `bluetoothName` fields
 *  - BLE connection lifecycle: connect(), disconnect(), deviceConnected(), destroy()
 *  - Retry-based connect: up to MAX_RETRIES attempts with exponential back-off
 *    (RETRY_DELAYS). successCallback fires on every successful connection
 *    (initial + every auto-reconnect). errorCallback fires only when all
 *    retries are exhausted.
 *  - Reconnect is suppressed when disconnect() / destroy() has been called.
 *
 * Subclasses should override:
 *  - onConnected()  – called after every successful BLE connection
 *  - onDestroy()    – called before intentional disconnect in destroy()
 */
export class BluetoothPreparationDevice extends PreparationDevice {
  protected bluetoothId: string = '';
  protected bluetoothName: string = '';

  /** The device ID passed to BLE calls. */
  protected deviceId: string = '';

  /** Set to true before intentionally calling ble.disconnect() so the
   *  disconnect callback does not schedule a reconnect. */
  private _intentionalDisconnect: boolean = false;

  private connectionSettled = false;
  private isConnected = false;
  private activeConnectId = 0;

  /** Maximum number of connection attempts (initial + retries). */
  private static readonly MAX_RETRIES = 2;

  /**
   * App-lifetime cache of device IDs found via BLE scan.
   * Skips the scan step on subsequent connects within the same session.
   */
  private static readonly _scannedDeviceIds: Set<string> = new Set<string>();

  private readonly bleLogger: Logger;

  private bleManager: CoffeeBluetoothDevicesService;

  constructor(_http: HttpClient, _preparation: Preparation) {
    super(_http, _preparation);
    this.bleLogger = new Logger('BluetoothPreparationDevice');
    const device = _preparation?.connectedPreparationDevice;
    if (device?.bluetoothId) {
      this.bluetoothId = device.bluetoothId;
    }
    if (device?.bluetoothName) {
      this.bluetoothName = device.bluetoothName;
    }
    this.deviceId = this.bluetoothId;
    this.bleManager = CoffeeBluetoothDevicesService.getInstance();
  }

  // ---------------------------------------------------------------------------
  // Public accessors
  // ---------------------------------------------------------------------------

  public getBluetoothId(): string {
    return this.bluetoothId;
  }

  public getBluetoothName(): string {
    return this.bluetoothName;
  }

  // ---------------------------------------------------------------------------
  // Subclass hooks
  // ---------------------------------------------------------------------------

  /** Called after every successful BLE connection (initial + auto-reconnect). */
  protected onConnected(): void {}

  /** Called at the start of destroy() before the intentional disconnect. */
  protected onDestroy(): void {}

  // ---------------------------------------------------------------------------
  // BLE lifecycle
  // ---------------------------------------------------------------------------

  private async _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Connects to the BLE device with automatic retries and exponential back-off.
   *
   * - Up to MAX_RETRIES (3) attempts are made.
   * - Delays between attempts: RETRY_DELAYS[0]=5 s, [1]=10 s, [2]=20 s.
   * - successCallback() is called on every successful connection (initial and
   *   every auto-reconnect after an unexpected drop).
   * - errorCallback() is called only when all retries are exhausted.
   * - After an unexpected disconnect _retryCount resets to 0 so a fresh set
   *   of 3 attempts is made.
   * - All reconnect activity stops when disconnect() / destroy() is called.
   *
   * @param successCallback  Invoked on each successful BLE connection.
   * @param errorCallback    Invoked when all retry attempts have been exhausted.
   * @param _scanForDevices  Internal – true on first call, false on retries.
   * @param _wasConnected    Internal – true once we have connected at least once.
   * @param _retryCount      Internal – current retry index (0-based).
   */
  public async connect(
    successCallback: () => void = () => {},
    errorCallback: () => void = () => {},
    autoReconnectCallback: () => void = () => {},
    autoDisconnectCallback: () => void = () => {},
    _wasConnected: boolean = false,
    _retryCount: number = 0,
  ): Promise<void> {
    if (_retryCount === 0) {
      this._intentionalDisconnect = false;
    }
    this.connectionSettled = false;
    this.isConnected = false;
    const localConnectId = ++this.activeConnectId;

    this.bleLogger.log(
      `connect() – deviceId: ${this.deviceId}, attempt: ${_retryCount + 1}/${BluetoothPreparationDevice.MAX_RETRIES}`,
    );

    if (Capacitor.getPlatform() === 'ios') {
      await this.bleManager.enableIOSBluetooth();
    }
    if (!this.deviceId) {
      this.bleLogger.log('No deviceId set – calling errorCallback');
      errorCallback();
      return;
    }

    if (this._intentionalDisconnect) {
      this.bleLogger.log('Intentional disconnect flag set – aborting');
      errorCallback();
      return;
    }

    // Perform a brief scan on the first attempt so the OS discovers the
    // peripheral (especially important on iOS). Retries skip the scan.
    if (!BluetoothPreparationDevice._scannedDeviceIds.has(this.deviceId)) {
      this.bleLogger.log('Scanning for BLE device: ' + this.deviceId);

      const foundDevice = await this.bleManager.findDeviceWithDirectId(
        this.deviceId,
        6000,
      );
      if (this._intentionalDisconnect) {
        this.bleLogger.log(
          'Intentional disconnect flag set during scan – aborting',
        );
        errorCallback();
        return;
      }
      if (foundDevice) {
        BluetoothPreparationDevice._scannedDeviceIds.add(this.deviceId);
      }

      await this._sleep(500);
      if (this._intentionalDisconnect) {
        this.bleLogger.log(
          'Intentional disconnect flag set after scan sleep – aborting',
        );
        errorCallback();
        return;
      }
    } else {
      this.bleLogger.log(
        'Skipping scan – device already cached: ' + this.deviceId,
      );
    }

    try {
      let disconnectTimer: any = null;

      const handleSuccess = (data: PeripheralData) => {
        clearTimeout(disconnectTimer);
        this.isConnected = true;
        if (this._intentionalDisconnect) {
          this.bleLogger.log(
            'Intentional disconnect flag set during connection success – disconnecting',
          );
          ble.disconnect(
            this.deviceId,
            () => {},
            () => {},
          );
          errorCallback();
          return;
        }
        this.bleLogger.log('BLE connected successfully');
        _retryCount = 0;
        if (_wasConnected === true) {
          autoReconnectCallback();
          //If we was already connected, call autoReconnect
        }
        _wasConnected = true;
        this.onConnected();
        successCallback();
      };

      const handleError = async (error: any) => {
        try {
          clearTimeout(disconnectTimer);
          this.bleLogger.log(
            `BLE error/disconnect (attempt ${_retryCount + 1}): ` +
              JSON.stringify(error),
          );

          if (this._intentionalDisconnect) {
            errorCallback();
            return;
          }

          this.bleLogger.log(
            `handleError – _wasConnected: ${_wasConnected}, _retryCount: ${_retryCount}, autoDisconnectCallback type: ${typeof autoDisconnectCallback}`,
          );
          if (_wasConnected && _retryCount === 0) {
            this.bleLogger.log(
              'handleError – triggering autoDisconnectCallback',
            );
            autoDisconnectCallback();
          }

          if (Capacitor.getPlatform() === 'ios') {
            await this.bleManager.enableIOSBluetooth();
          }
          if (this._intentionalDisconnect) {
            errorCallback();
            return;
          }

          await this.bleManager.findDeviceWithDirectId(this.deviceId, 6000);
          if (this._intentionalDisconnect) {
            errorCallback();
            return;
          }

          // Give it a short delay before reconnect
          await sleep(500);
          if (this._intentionalDisconnect) {
            errorCallback();
            return;
          }

          let delay = 1000;
          if (!_wasConnected) {
            // ── Initial connection failed ──────────────────────────────────────
            if (_retryCount >= BluetoothPreparationDevice.MAX_RETRIES - 1) {
              this.bleLogger.log(
                `All ${BluetoothPreparationDevice.MAX_RETRIES} connection attempts failed – calling errorCallback`,
              );
              errorCallback();
            }

            this.bleLogger.log(
              `Attempt ${_retryCount + 1} failed – retrying in ${delay / 1000} s…`,
            );
            await this._sleep(delay);

            if (!this._intentionalDisconnect) {
              this.connect(
                successCallback,
                errorCallback,
                autoReconnectCallback,
                autoDisconnectCallback,
                _wasConnected,
                _retryCount + 1,
              );
            }
          } else {
            // ── Unexpected drop after successful connection ─────────────────────
            // Start a fresh set of MAX_RETRIES reconnect attempts.
            if (_retryCount >= BluetoothPreparationDevice.MAX_RETRIES - 1) {
              this.bleLogger.log(
                `Auto-reconnect exhausted on all ${BluetoothPreparationDevice.MAX_RETRIES} initial attempts – calling errorCallback, throw error but still try to connect`,
              );
              errorCallback();
            }

            this.bleLogger.log(
              `Unexpected disconnect – reconnect attempt ${_retryCount + 1} in ${delay / 1000} s…`,
            );
            await this._sleep(delay);

            if (!this._intentionalDisconnect) {
              this.connect(
                successCallback,
                errorCallback,
                autoReconnectCallback,
                autoDisconnectCallback,
                _wasConnected,
                _retryCount + 1,
              );
            }
          }
        } catch (ex) {
          this.bleLogger.log(
            `Exception in BLE disconnect callback: ${JSON.stringify(ex)}`,
          );
          errorCallback();
        }
      };

      const onConnectSuccess = (data: PeripheralData) => {
        if (localConnectId !== this.activeConnectId) return;
        if (Capacitor.getPlatform() === 'android') {
          if (this.connectionSettled) return;
          this.connectionSettled = true;
        }
        handleSuccess(data);
      };

      const onConnectError = (error: any) => {
        if (localConnectId !== this.activeConnectId) return;
        if (Capacitor.getPlatform() === 'android') {
          if (this.connectionSettled && !this.isConnected) return;
          this.connectionSettled = true;
          this.isConnected = false;
        }
        handleError(error);
      };

      disconnectTimer = setTimeout(() => {
        if (localConnectId !== this.activeConnectId) return;
        if (Capacitor.getPlatform() === 'android') {
          if (this.connectionSettled) return;
        }
        this.bleLogger.log(
          'Connection took too long, triggering disconnect to reset state',
        );
        ble.disconnect(
          this.deviceId,
          () => {
            if (localConnectId !== this.activeConnectId) return;
            if (Capacitor.getPlatform() === 'android') {
              onConnectError('Connection timeout');
            }
          },
          () => {
            if (localConnectId !== this.activeConnectId) return;
            if (Capacitor.getPlatform() === 'android') {
              onConnectError('Connection timeout');
            }
          },
        );
      }, 5000);

      ble.connect(this.deviceId, onConnectSuccess, onConnectError);
    } catch (ex) {
      this.bleLogger.log('ble.connect threw: ' + JSON.stringify(ex));
      errorCallback();
    }
  }

  /**
   * Intentionally disconnects from the BLE device.
   */
  public async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.deviceId) {
        resolve();
        return;
      }
      this._intentionalDisconnect = true;
      this.isConnected = false;
      this.connectionSettled = false;
      this.activeConnectId++;
      ble.disconnect(
        this.deviceId,
        () => {
          resolve();
        },
        () => {
          resolve();
        },
      );
    });
  }

  /**
   * Resolves true if the BLE device is currently connected, false otherwise.
   */
  public async deviceConnected(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.deviceId) {
        resolve(false);
        return;
      }
      ble.isConnected(
        this.deviceId,
        () => {
          resolve(true);
        },
        () => {
          resolve(false);
        },
      );
    });
  }

  /**
   * Cleans up the device: calls onDestroy() then issues an intentional disconnect.
   * The reconnect loop will NOT fire after this call.
   */
  public destroy(): void {
    this._intentionalDisconnect = true;
    this.isConnected = false;
    this.connectionSettled = false;
    this.activeConnectId++;
    this.bleLogger.log('destroy() called');
    this.onDestroy();
    this.disconnect();
  }
}
