import { PeripheralData } from './ble.types';
import { Logger } from './common/logger';
import { TemperatureDevice } from './temperatureBluetoothDevice';

declare var ble: any;

/**
 * INKBIRD TempWise TNT-11-B truly wireless food thermometer.
 *
 * A probe-in-meat Bluetooth 5.4 thermometer sold under both the INKBIRD
 * and TempWise brands. The BLE local name is "BG-BT1W".
 *
 * Protocol decoded by the Home Assistant community:
 *   https://community.home-assistant.io/t/help-reading-data-from-an-inkbird-tempwise-bg-bt1w-bluetooth-thermometer/837429
 *
 * NOTE: Untested on physical hardware in this codebase. Protocol is
 * confirmed by multiple independent community implementations (Python/Bleak,
 * ESPHome). A contributor with a TNT-11-B should verify and sign off.
 *
 * BLE topology (from nRF Connect capture):
 *   Service:    0000ff01-0000-1000-8000-00805f9b34fb
 *   Notify:     0000ff03-0000-1000-8000-00805f9b34fb  ← temperature data
 *   Write (WNR): 0000ff02-0000-1000-8000-00805f9b34fb (purpose unknown)
 *   Write (W):   0000ff04-0000-1000-8000-00805f9b34fb (purpose unknown)
 *
 * No activation sequence required — subscribing to 0xff03 is sufficient
 * to start the temperature stream.
 *
 * Packet format:
 *   bytes[0–1]: signed int16 little-endian; value / 100 = temperature °C
 *   (0.01 °C resolution; further bytes not yet decoded)
 *
 * Device identification: advertises as "BG-BT1W".
 */
export class InkbirdTnt11BThermometer extends TemperatureDevice {
  public static readonly DEVICE_NAME = 'BG-BT1W';
  public static readonly SERVICE_UUID = '0000ff01-0000-1000-8000-00805f9b34fb';
  public static readonly NOTIFY_CHAR_UUID =
    '0000ff03-0000-1000-8000-00805f9b34fb';

  private static readonly PACKET_MIN_LENGTH = 2;

  private logger: Logger;

  constructor(data: PeripheralData) {
    super(data);
    this.logger = new Logger('InkbirdTnt11BThermometer');
    this.connect();
  }

  public static test(device: any): boolean {
    return (
      device?.name?.toLowerCase() ===
      InkbirdTnt11BThermometer.DEVICE_NAME.toLowerCase()
    );
  }

  public connect(): void {
    this.attachNotification();
  }

  public disconnect(): void {
    this.detachNotification();
  }

  private attachNotification(): void {
    ble.startNotification(
      this.device_id,
      InkbirdTnt11BThermometer.SERVICE_UUID,
      InkbirdTnt11BThermometer.NOTIFY_CHAR_UUID,
      (_data: ArrayBuffer) => {
        this.parsePacket(new Uint8Array(_data));
      },
      (_err: any) => {
        this.logger.log('TNT-11-B notification error: ' + JSON.stringify(_err));
      },
    );
  }

  private parsePacket(data: Uint8Array): void {
    if (data.length < InkbirdTnt11BThermometer.PACKET_MIN_LENGTH) {
      return;
    }
    // Signed int16 little-endian, units = hundredths of °C
    const raw = data[0] | (data[1] << 8);
    const signed = raw > 0x7fff ? raw - 0x10000 : raw;
    const tempC = signed / 100;
    this.logger.log(`TNT-11-B probe: ${tempC.toFixed(2)}°C`);
    this.setTemperature(tempC, data);
  }

  private detachNotification(): void {
    ble.stopNotification(
      this.device_id,
      InkbirdTnt11BThermometer.SERVICE_UUID,
      InkbirdTnt11BThermometer.NOTIFY_CHAR_UUID,
      (_e: any) => {},
      (_e: any) => {},
    );
  }
}
