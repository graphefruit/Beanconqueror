import { Provider } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { DeviceIdentityService } from '../services/deviceIdentity/device-identity.service';
import { UIAlert } from '../services/uiAlert';
import { UILog } from '../services/uiLog';
import { UIStorage } from '../services/uiStorage';
import { createMockTranslateService, createMockUIAlert } from './mock-services';

interface Stored {
  config: { uuid: string };
}

export interface DeletionNote {
  collection: string;
  uuid: string;
  rev: number;
}

/**
 * A database in memory behind the real storages and the real deletion
 * journal. It copies values like IndexedDB does, so what is stored and what
 * the app holds in memory are checked apart.
 */
export class MemoryDatabase {
  public readonly values = new Map<string, unknown>();
  /** Keys that can neither be written nor removed. */
  public readonly failingWrites = new Set<string>();
  /** Keys that cannot be read. */
  public readonly unreadable = new Set<string>();
  public readonly set = jasmine
    .createSpy('set')
    .and.callFake((key: string, value: unknown) => {
      if (this.failingWrites.has(key)) {
        return Promise.reject(new Error('write failed'));
      }
      this.values.set(key, structuredClone(value));
      return Promise.resolve(true);
    });

  public readonly remove = jasmine
    .createSpy('remove')
    .and.callFake((key: string) => {
      if (this.failingWrites.has(key)) {
        return Promise.reject(new Error('remove failed'));
      }
      this.values.delete(key);
      return Promise.resolve();
    });

  /** What the storages need; call it inside `beforeEach`. */
  public providers(): Provider[] {
    const read = (key: string) =>
      this.unreadable.has(key)
        ? Promise.reject(new Error('read failed'))
        : Promise.resolve(
            this.values.has(key) ? structuredClone(this.values.get(key)) : null,
          );
    spyOn(UIAlert, 'getInstance').and.returnValue(createMockUIAlert());
    return [
      {
        provide: UIStorage,
        useValue: {
          get: jasmine.createSpy('get').and.callFake(read),
          getOrFail: jasmine.createSpy('getOrFail').and.callFake(read),
          set: this.set,
          remove: this.remove,
        },
      },
      {
        provide: UILog,
        useValue: jasmine.createSpyObj('UILog', [
          'log',
          'info',
          'error',
          'debug',
        ]),
      },
      { provide: TranslateService, useValue: createMockTranslateService() },
      {
        provide: DeviceIdentityService,
        useValue: { getDeviceId: () => 'device-a' },
      },
    ];
  }

  /** The uuids stored under the key, in stored order. */
  public uuids(key: string): string[] {
    return uuidsOf((this.values.get(key) ?? []) as Stored[]);
  }

  /** How often the key was written. */
  public writes(key: string): number {
    return this.set.calls.allArgs().filter(([_key]) => _key === key).length;
  }

  /** The keys in the order they were written. */
  public written(): string[] {
    return this.set.calls.allArgs().map(([_key]) => _key as string);
  }

  public journal(): DeletionNote[] {
    return (this.values.get('DELETION_JOURNAL') ?? []) as DeletionNote[];
  }
}

export function uuidsOf(entries: readonly unknown[]): string[] {
  return (entries as Stored[]).map((_entry) => _entry.config.uuid);
}
