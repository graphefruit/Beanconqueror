import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { TemperatureDevice } from './temperatureBluetoothDevice';

declare var ble: any;

export interface EmberBatteryInfo {
  level: number;
  charging: boolean;
}

export class EmberThermometer extends TemperatureDevice {
  // NOTE: verify this against an actual scan dump from your mug - I don't
  // have a confirmed advertised local name. The python-ember-mug project
  // identifies the device by EMBER_SERVICE_UUID rather than name, which is
  // why test() below also checks advertised service UUIDs as a fallback.
  public static DEVICE_NAME = 'ember';

  public static EMBER_SERVICE_UUID = 'fc543622-236c-4c94-8fa9-944a3e5353fa';
  public static TEMP_CHAR_UUID = 'fc540002-236c-4c94-8fa9-944a3e5353fa';
  public static PUSH_EVENT_CHAR_UUID = 'fc540012-236c-4c94-8fa9-944a3e5353fa';
  public static BATTERY_CHAR_UUID = 'fc540007-236c-4c94-8fa9-944a3e5353fa';

  private static readonly EVENT_DRINK_TEMPERATURE_CHANGED = 5;

  private logger: Logger;
  public batteryInfo: EmberBatteryInfo | null = null;

  constructor(data: PeripheralData) {
    super(data);
    this.logger = new Logger('EmberThermometer');
    this.connect();
  }

  // Verified on Android against a real Ember Cup 2: device.name contains
  // "ember" pre-connection, so the name check below is the primary match.
  // The service-UUID branch is a fallback for devices that advertise
  // services but report no name.
  public static test(device: any): boolean {
    if (!device) {
      return false;
    }

    if (
      device.name &&
      device.name.toLowerCase().includes(EmberThermometer.DEVICE_NAME)
    ) {
      return true;
    }

    // Fallback: match on advertised service UUID (iOS exposes this in
    // advertising.kCBAdvDataServiceUUIDs; Android may populate
    // device.services after discovery). Confirm field names against a real
    // scan result before relying on this branch.
    const serviceUuids: string[] =
      device.services ||
      (device.advertising && device.advertising.kCBAdvDataServiceUUIDs) ||
      [];

    return serviceUuids.some(
      (uuid: string) =>
        uuid.toLowerCase() === EmberThermometer.EMBER_SERVICE_UUID,
    );
  }

  public connect() {
    this.readCurrentTemperature();
    this.readBattery();
    this.attachNotification();
  }

  public disconnect() {
    this.deattachNotification();
  }

  private attachNotification() {
    this.logger.log('EmberThermometer - attaching push-event notification');

    ble.startNotification(
      this.device_id,
      EmberThermometer.EMBER_SERVICE_UUID,
      EmberThermometer.PUSH_EVENT_CHAR_UUID,

      async (_data: any) => {
        this.handlePushEvent(new Uint8Array(_data));
      },

      (err: any) => {
        this.logger.log(
          'EmberThermometer - push-event notification error: ' +
            JSON.stringify(err),
        );
      },
    );
  }

  private deattachNotification() {
    this.logger.log('EmberThermometer - detaching push-event notification');

    ble.stopNotification(
      this.device_id,
      EmberThermometer.EMBER_SERVICE_UUID,
      EmberThermometer.PUSH_EVENT_CHAR_UUID,
      () => {
        this.logger.log('EmberThermometer - push-event notification detached');
      },
      (err: any) => {
        this.logger.log(
          'EmberThermometer - failed to detach push-event notification: ' +
            JSON.stringify(err),
        );
      },
    );
  }

  private handlePushEvent(eventData: Uint8Array) {
    if (!eventData || eventData.length < 1) {
      this.logger.log(
        'EmberThermometer - push event with no payload, ignoring',
      );
      return;
    }
    const eventId = eventData[0];
    this.logger.log('EmberThermometer - push event received: ' + eventId);

    switch (eventId) {
      case EmberThermometer.EVENT_DRINK_TEMPERATURE_CHANGED:
        this.readCurrentTemperature();
        break;
      // Battery/charger events (1,2,3) and target-temp (4) are received but
      // not wired up yet - battery is currently only refreshed on connect()
      // via readBattery() below.
      default:
        break;
    }
  }

  private readCurrentTemperature() {
    ble.read(
      this.device_id,
      EmberThermometer.EMBER_SERVICE_UUID,
      EmberThermometer.TEMP_CHAR_UUID,

      (buffer: ArrayBuffer) => {
        this.parseTemperature(new Uint8Array(buffer));
      },

      (err: any) => {
        this.logger.log(
          'EmberThermometer - Temperature read failed: ' + JSON.stringify(err),
        );
      },
    );
  }

  private parseTemperature(data: Uint8Array) {
    if (!data || data.length < 2) {
      this.logger.log('EmberThermometer - Temperature payload too short');
      return;
    }

    const raw = data[0] | (data[1] << 8); // little-endian uint16
    const tempC = raw / 100;

    this.logger.log('EmberThermometer - temperature is: ' + tempC);
    this.setTemperature(tempC, data);
  }

  /**
   * Overrides TemperatureDevice.getBattery(): Ember exposes battery on a
   * custom characteristic (fc540007) rather than the standard Battery
   * Service (180F/2A19) the base implementation reads from. byte[0] =
   * percent, byte[1] = on-charging-base flag.
   */
  public getBattery(): Promise<number> {
    return new Promise((resolve, reject) => {
      ble.read(
        this.device_id,
        EmberThermometer.EMBER_SERVICE_UUID,
        EmberThermometer.BATTERY_CHAR_UUID,

        (buffer: ArrayBuffer) => {
          const data = new Uint8Array(buffer);
          this.batteryInfo = {
            level: data[0],
            charging: data.length > 1 ? data[1] === 1 : false,
          };
          resolve(data[0]);
        },

        (err: unknown) => {
          if (!(err instanceof Error)) {
            err = new Error(JSON.stringify(err));
          }
          reject(err);
        },
      );
    });
  }

  private readBattery() {
    this.getBattery().catch((err) => {
      this.logger.log(
        'EmberThermometer - Battery read failed: ' + JSON.stringify(err),
      );
    });
  }
}
