import type { DeviceInfo } from '@capacitor/device';

import { ISettings } from '../../interfaces/settings/iSettings';
import { DeepReadonly } from '../core/read-only';

export const SUPPORT_INFO_FILE = 'support-info.json';

type SettingValue = boolean | number | string;

export interface SupportInfo {
  app_version: string;
  platform: string;
  os_version: string;
  manufacturer: string;
  model: string;
  webview_version: string;
  /** The type of each coupled Bluetooth device, null when none is coupled. */
  devices: Record<
    'scale' | 'pressure' | 'temperature' | 'refractometer',
    string | null
  >;
  bluetooth_settings: Record<string, SettingValue>;
}

const BLUETOOTH_SETTING =
  /^(bluetooth_|acaia_|scale_|pressure_|temperature_|refractometer_)/;

/**
 * What the support package tells about the app and device next to the log.
 * The device name the user chose and the ids of Bluetooth devices stay out.
 */
export function supportInfo(
  settings: DeepReadonly<ISettings>,
  device: DeviceInfo,
  appVersion: string,
): SupportInfo {
  const coupled = (id: string, type: string | null): string | null =>
    (id && type) || null;
  const bluetooth: Record<string, SettingValue> = {};
  for (const [key, value] of Object.entries(settings).sort(([a], [b]) =>
    a < b ? -1 : 1,
  )) {
    // Only switches, numbers and fixed choices, so ids and names stay out.
    if (
      BLUETOOTH_SETTING.test(key) &&
      (typeof value === 'boolean' ||
        typeof value === 'number' ||
        (typeof value === 'string' && key.endsWith('_mode')))
    ) {
      bluetooth[key] = value;
    }
  }
  return {
    app_version: appVersion,
    platform: device.platform,
    os_version: device.osVersion,
    manufacturer: device.manufacturer,
    model: device.model,
    webview_version: device.webViewVersion,
    devices: {
      scale: coupled(settings.scale_id, settings.scale_type),
      pressure: coupled(settings.pressure_id, settings.pressure_type),
      temperature: coupled(settings.temperature_id, settings.temperature_type),
      refractometer: coupled(
        settings.refractometer_id,
        settings.refractometer_type,
      ),
    },
    bluetooth_settings: bluetooth,
  };
}
