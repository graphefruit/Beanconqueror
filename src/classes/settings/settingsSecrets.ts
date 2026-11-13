import {
  BrewByWeightWebhookConfig,
  ISettings,
} from '../../interfaces/settings/iSettings';

/**
 * Path to a settings field that holds a credential: either a top-level
 * settings field or a field inside the brew-by-weight webhook config.
 */
export type SettingsSecretPath =
  | readonly [keyof ISettings]
  | readonly ['brew_by_weight_webhook', keyof BrewByWeightWebhookConfig];

/**
 * Settings fields that hold credentials (account logins, API keys, tokens).
 *
 * Backup and export files leave the device: users keep them in cloud drives,
 * mail them or hand them to other people. Credentials must therefore never be
 * written into these files. The fields stay in the file with an empty value,
 * so the backup format does not change, and an import keeps the values that
 * are already stored on the device.
 */
export const SETTINGS_SECRET_PATHS: readonly SettingsSecretPath[] = [
  ['visualizer_username'],
  ['visualizer_password'],
  ['cloud_ai_api_key'],
  ['brew_by_weight_webhook', 'bearerToken'],
  // Username and password only work as a pair, like the Visualizer login.
  ['brew_by_weight_webhook', 'basicUsername'],
  ['brew_by_weight_webhook', 'basicPassword'],
  ['brew_by_weight_webhook', 'customHeaderValue'],
];

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEmptySecret(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Returns a copy of the given settings object in which every credential
 * field that is present is emptied. The given object is left untouched.
 */
export function withoutSettingsSecrets<T>(settings: T): T {
  if (!isPlainObject(settings)) {
    return settings;
  }
  const copy: PlainObject = { ...settings };
  for (const path of SETTINGS_SECRET_PATHS) {
    let parent = copy;
    let usable = true;
    for (const key of path.slice(0, -1)) {
      const child = parent[key];
      if (!isPlainObject(child)) {
        usable = false;
        break;
      }
      // Copy every nested object on the way, so the original stays intact.
      const childCopy = { ...child };
      parent[key] = childCopy;
      parent = childCopy;
    }
    const field = path[path.length - 1];
    if (usable && field in parent) {
      parent[field] = '';
    }
  }
  return copy as T;
}

/**
 * Returns a copy of the imported settings object in which every empty
 * credential field is filled with the value stored on the device. Credentials
 * contained in the imported object (e.g. from older backups) are kept.
 */
export function withDeviceSettingsSecrets<T>(imported: T, device: unknown): T {
  if (!isPlainObject(imported) || !isPlainObject(device)) {
    return imported;
  }
  const copy: PlainObject = { ...imported };
  for (const path of SETTINGS_SECRET_PATHS) {
    let parent = copy;
    let deviceParent: PlainObject = device;
    let usable = true;
    for (const key of path.slice(0, -1)) {
      const child = parent[key];
      const deviceChild = deviceParent[key];
      if (!isPlainObject(child) || !isPlainObject(deviceChild)) {
        usable = false;
        break;
      }
      const childCopy = { ...child };
      parent[key] = childCopy;
      parent = childCopy;
      deviceParent = deviceChild;
    }
    const field = path[path.length - 1];
    if (
      usable &&
      isEmptySecret(parent[field]) &&
      !isEmptySecret(deviceParent[field])
    ) {
      parent[field] = deviceParent[field];
    }
  }
  return copy as T;
}
