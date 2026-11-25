import { computed, inject, Service, signal, Signal } from '@angular/core';

import { ISettings } from '../../interfaces/settings/iSettings';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { DeepReadonly, freezeInDev, toPlainData } from '../core/read-only';
import { readSettled, StoreHub } from '../core/store-hub';

type Fields = Record<string, unknown>;

interface Snapshot {
  readonly settings: DeepReadonly<ISettings>;
  /** `JSON.stringify` of each top-level value. */
  readonly prints: ReadonlyMap<string, string | undefined>;
}

/**
 * The settings for new code, as read-only plain data. Legacy code keeps the
 * one changeable `Settings` instance of `UISettingsStorage` and holds parts
 * of it, so a change reaches that instance in place and is saved from there.
 */
@Service()
export class SettingsStore {
  private readonly legacy = inject(UISettingsStorage);
  private readonly version = signal(0);
  private instanceBuilt = false;
  private lastWrite: Promise<unknown> = Promise.resolve();

  /**
   * A new object after every change; a top-level value that did not change
   * keeps its object.
   */
  public readonly settings: Signal<DeepReadonly<ISettings>>;

  public constructor() {
    const empty: Snapshot = {
      settings: copyOf(this.legacy.getSettings()),
      prints: new Map(),
    };
    const snapshot = readSettled(
      inject(StoreHub),
      // The instance is built only after the stored settings were read.
      { isRead: () => this.instanceBuilt && this.legacy.isRead() },
      this.version,
      (previous) => reconcile(previous ?? empty, this.legacy.getSettings()),
      empty,
    );
    this.settings = computed(() => snapshot().settings);
    const markStale = () => this.version.update((version) => version + 1);
    // Stores live as long as the app, so there is nothing to unsubscribe.
    this.legacy.attachOnEvent().subscribe(markStale);
    this.legacy.storageReady().then(() => {
      this.instanceBuilt = true;
      markStale();
    }, markStale);
  }

  /**
   * `change` gets a copy of the settings as they are when the writes before
   * have ended. What it changed goes into the settings instance in place and
   * is saved. Resolves whether it was saved; when not, the instance is as
   * before.
   */
  public update(change: (draft: ISettings) => void): Promise<boolean> {
    const result = this.lastWrite.then(async () => {
      const live = this.legacy.getSettings() as unknown as Fields;
      const draft = toPlainData(live);
      change(draft as unknown as ISettings);
      const before: Fields = {};
      const changed: string[] = [];
      for (const key of new Set([
        ...Object.keys(live),
        ...Object.keys(draft),
      ])) {
        if (JSON.stringify(live[key]) !== JSON.stringify(draft[key])) {
          if (key in live) {
            before[key] = toPlainData(live[key]);
          }
          changed.push(key);
          assignInPlace(live, key, draft, key);
        }
      }
      if (changed.length === 0) {
        return true;
      }
      const saved = await this.legacy.saveSettings(
        live as unknown as ISettings,
      );
      if (!saved) {
        for (const key of changed) {
          assignInPlace(live, key, before, key);
        }
        this.version.update((version) => version + 1);
      }
      return saved;
    });
    this.lastWrite = result.catch(() => undefined);
    return result;
  }
}

function copyOf(value: unknown): DeepReadonly<ISettings> {
  return freezeInDev(toPlainData(value) as ISettings);
}

function reconcile(previous: Snapshot, live: unknown): Snapshot {
  const fields = live as Fields;
  const old = previous.settings as unknown as Fields;
  const prints = new Map<string, string | undefined>();
  const settings: Fields = {};
  let changed = Object.keys(old).length !== Object.keys(fields).length;
  for (const key of Object.keys(fields)) {
    const print = JSON.stringify(fields[key]);
    prints.set(key, print);
    if (previous.prints.has(key) && previous.prints.get(key) === print) {
      settings[key] = old[key];
    } else {
      settings[key] = freezeInDev(toPlainData(fields[key]));
      changed = true;
    }
  }
  if (!changed) {
    return previous;
  }
  return {
    settings: freezeInDev(settings) as DeepReadonly<ISettings>,
    prints,
  };
}

/**
 * Makes `target[key]` equal to `source[from]` and keeps the objects and
 * arrays of `target` that legacy code may hold: objects take on the fields,
 * arrays the items, and a key left out of `source` is removed.
 */
export function assignInPlace(
  target: Fields,
  key: string,
  source: Fields,
  from: string,
): void {
  const value = source[from];
  const current = target[key];
  if (!(from in source)) {
    delete target[key];
  } else if (Array.isArray(current) && Array.isArray(value)) {
    current.splice(0, current.length, ...(toPlainData(value) as unknown[]));
  } else if (isObject(current) && isObject(value)) {
    for (const field of new Set([
      ...Object.keys(current),
      ...Object.keys(value),
    ])) {
      assignInPlace(current, field, value, field);
    }
  } else {
    target[key] = toPlainData(value);
  }
}

function isObject(value: unknown): value is Fields {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
