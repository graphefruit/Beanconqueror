import type { DeviceInfo } from '@capacitor/device';

import { ScaleType } from '../../../classes/devices';
import { Settings } from '../../../classes/settings/settings';
import { ISettings } from '../../../interfaces/settings/iSettings';
import { supportInfo } from '../support-info-rules';

const DEVICE: DeviceInfo = {
  name: "Lars' phone",
  model: 'Pixel 8',
  platform: 'android',
  operatingSystem: 'android',
  osVersion: '16',
  manufacturer: 'Google',
  isVirtual: false,
  webViewVersion: '142.0',
};

function settings(fields: Partial<ISettings> = {}): ISettings {
  const result = new Settings();
  Object.assign(result, fields);
  return JSON.parse(JSON.stringify(result)) as ISettings;
}

describe('supportInfo', () => {
  it('names app, system and device model, but not the device name', () => {
    const info = supportInfo(settings(), DEVICE, '9.0.0');

    expect(info).toEqual(
      jasmine.objectContaining({
        app_version: '9.0.0',
        platform: 'android',
        os_version: '16',
        manufacturer: 'Google',
        model: 'Pixel 8',
        webview_version: '142.0',
      }),
    );
    expect(JSON.stringify(info)).not.toContain("Lars' phone");
  });

  it('names the type of each coupled device and leaves out its id', () => {
    const info = supportInfo(
      settings({
        scale_id: 'AA:BB:CC:DD:EE:FF',
        scale_type: ScaleType.LUNAR,
        pressure_id: '',
        temperature_type: null,
      }),
      DEVICE,
      '9.0.0',
    );

    expect(info.devices).toEqual({
      scale: 'LUNAR',
      pressure: null,
      temperature: null,
      refractometer: null,
    });
    expect(JSON.stringify(info)).not.toContain('AA:BB:CC:DD:EE:FF');
  });

  it('lists the Bluetooth switches and numbers, not other settings', () => {
    const info = supportInfo(
      settings({
        bluetooth_scale_tare_on_brew: false,
        pressure_threshold_bar: 2,
        visualizer_password: 'secret',
      }),
      DEVICE,
      '9.0.0',
    );

    expect(info.bluetooth_settings).toEqual(
      jasmine.objectContaining({
        bluetooth_scale_tare_on_brew: false,
        bluetooth_command_delay: 50,
        bluetooth_scale_acaia_connection_mode: 'V2',
        pressure_threshold_bar: 2,
        scale_log: false,
      }),
    );
    const keys = Object.keys(info.bluetooth_settings);
    expect(keys).toEqual([...keys].sort());
    expect(
      keys.filter((key) =>
        /_id$|^(scale|pressure|temperature|refractometer)_type$/.test(key),
      ),
    ).toEqual([]);
    expect(JSON.stringify(info)).not.toContain('secret');
  });
});
