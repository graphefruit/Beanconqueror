import { Settings } from '../settings';
import {
  withDeviceSettingsSecrets,
  withoutSettingsSecrets,
} from '../settingsSecrets';

function settingsWithSecrets(prefix: string): Settings {
  const settings = new Settings();
  settings.visualizer_username = `${prefix}-user`;
  settings.visualizer_password = `${prefix}-password`;
  settings.cloud_ai_api_key = `${prefix}-key`;
  settings.brew_by_weight_webhook.url = 'https://webhook.example.com';
  settings.brew_by_weight_webhook.bearerToken = `${prefix}-bearer`;
  settings.brew_by_weight_webhook.basicUsername = `${prefix}-basic-user`;
  settings.brew_by_weight_webhook.basicPassword = `${prefix}-basic-password`;
  settings.brew_by_weight_webhook.customHeaderName = 'X-Api-Key';
  settings.brew_by_weight_webhook.customHeaderValue = `${prefix}-header`;
  return settings;
}

const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

describe('settings secrets', () => {
  it('empties the credentials on a copy and leaves the live settings intact', () => {
    const live = settingsWithSecrets('live');
    const snapshot = plain(live);

    const stripped = withoutSettingsSecrets(live);

    expect(stripped.visualizer_username).toBe('');
    expect(stripped.visualizer_password).toBe('');
    expect(stripped.cloud_ai_api_key).toBe('');
    expect(stripped.brew_by_weight_webhook.bearerToken).toBe('');
    expect(stripped.brew_by_weight_webhook.basicUsername).toBe('');
    expect(stripped.brew_by_weight_webhook.basicPassword).toBe('');
    expect(stripped.brew_by_weight_webhook.customHeaderValue).toBe('');
    expect(stripped.brew_by_weight_webhook.url).toBe(
      'https://webhook.example.com',
    );
    expect(stripped.brew_by_weight_webhook.customHeaderName).toBe('X-Api-Key');
    expect(plain(live)).toEqual(snapshot);
  });

  it('does not add fields that are missing', () => {
    expect(withoutSettingsSecrets({ language: 'en' })).toEqual({
      language: 'en',
    });
  });

  it('fills only empty credentials from the device without changing either side', () => {
    const device = settingsWithSecrets('device');
    const imported = withoutSettingsSecrets(settingsWithSecrets('backup'));
    imported.cloud_ai_api_key = 'backup-key';
    const importedSnapshot = plain(imported);
    const deviceSnapshot = plain(device);

    const merged = withDeviceSettingsSecrets(imported, device);

    expect(merged.cloud_ai_api_key).toBe('backup-key');
    expect(merged.visualizer_password).toBe('device-password');
    expect(merged.brew_by_weight_webhook.basicPassword).toBe(
      'device-basic-password',
    );
    expect(plain(imported)).toEqual(importedSnapshot);
    expect(plain(device)).toEqual(deviceSnapshot);
  });
});
