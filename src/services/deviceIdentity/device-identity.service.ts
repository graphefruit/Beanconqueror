import { inject, Injectable } from '@angular/core';

import { DEVICE_STORAGE_KEY } from '../../classes/changeTracking/localStorageKeys';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UIStorage } from '../uiStorage';

/** Stored value of this installation's identity. */
export interface IDeviceIdentity {
  device_id: string;
  /** Milliseconds since epoch. */
  created_at: number;
}

/**
 * Identifies this installation for change tracking.
 *
 * The device id is its own random value; it is not the analytics id. It is
 * stored outside the settings under a local-only key, so it never leaves the
 * device with a backup and an import never replaces it.
 */
@Injectable({
  providedIn: 'root',
})
export class DeviceIdentityService {
  private readonly uiStorage = inject(UIStorage);
  private readonly uiLog = inject(UILog);

  private deviceId = '';
  private initialization: Promise<void> | undefined;

  public initialize(): Promise<void> {
    if (this.initialization === undefined) {
      this.initialization = this.__initialize();
    }
    return this.initialization;
  }

  /** Empty string as long as the service is not initialized. */
  public getDeviceId(): string {
    return this.deviceId;
  }

  private async __initialize(): Promise<void> {
    let stored: unknown;
    try {
      stored = await this.uiStorage.getOrFail(DEVICE_STORAGE_KEY);
    } catch {
      // A stored id may exist but could not be read; it must not be
      // replaced. The id below only lives for this session.
      this.deviceId = UIHelper.generateUUID();
      this.uiLog.info(
        'DeviceIdentityService - stored device id could not be read, using a temporary one',
      );
      return;
    }

    if (DeviceIdentityService.isValid(stored)) {
      this.deviceId = stored.device_id;
      return;
    }

    const identity: IDeviceIdentity = {
      device_id: UIHelper.generateUUID(),
      created_at: Date.now(),
    };
    this.deviceId = identity.device_id;
    try {
      await this.uiStorage.set(DEVICE_STORAGE_KEY, identity);
    } catch {
      this.uiLog.info(
        'DeviceIdentityService - device id could not be stored, using it for this session only',
      );
    }
  }

  private static isValid(_value: unknown): _value is IDeviceIdentity {
    const deviceId = (_value as Partial<IDeviceIdentity> | null)?.device_id;
    return typeof deviceId === 'string' && deviceId.length > 0;
  }
}
