import { IConfig } from '../../interfaces/objectConfig/iObjectConfig';
import {
  CHANGE_TRACKED_COLLECTIONS,
  copyChangeInfo,
  estimateCreatedAt,
  FillChangeInfoStats,
  fillMissingChangeInfo,
  isChangeTrackedCollection,
  stampAdded,
  stampUpdated,
} from './changeTracking';

const NOW = 1_800_000_000_000;

function config(_values: Partial<IConfig> = {}): IConfig {
  return { uuid: 'entry-1', unix_timestamp: 1_700_000_000, ..._values };
}

describe('changeTracking', () => {
  describe('CHANGE_TRACKED_COLLECTIONS', () => {
    it('contains the entry collections but not settings or version', () => {
      expect([...CHANGE_TRACKED_COLLECTIONS].sort()).toEqual(
        [
          'BARISTAMODE_BREWS',
          'BEANS',
          'BREWS',
          'GRAPH',
          'GREEN_BEANS',
          'MILL',
          'PREPARATION',
          'ROASTING_MACHINES',
          'WATER',
        ].sort(),
      );
      expect(isChangeTrackedCollection('SETTINGS')).toBeFalse();
      expect(isChangeTrackedCollection('VERSION')).toBeFalse();
      expect(isChangeTrackedCollection('BREWS')).toBeTrue();
    });
  });

  describe('estimateCreatedAt', () => {
    it('converts seconds to milliseconds', () => {
      expect(estimateCreatedAt(1_700_000_000)).toBe(1_700_000_000_000);
    });

    it('keeps values that already are milliseconds', () => {
      expect(estimateCreatedAt(1_700_000_000_123)).toBe(1_700_000_000_123);
    });

    it('reads numeric strings', () => {
      expect(estimateCreatedAt('1700000000')).toBe(1_700_000_000_000);
    });

    it('gives 0 for missing, zero, negative and invalid values', () => {
      expect(estimateCreatedAt(0)).toBe(0);
      expect(estimateCreatedAt(-5)).toBe(0);
      expect(estimateCreatedAt(NaN)).toBe(0);
      expect(estimateCreatedAt(Infinity)).toBe(0);
      expect(estimateCreatedAt(undefined)).toBe(0);
      expect(estimateCreatedAt(null)).toBe(0);
      expect(estimateCreatedAt('not a number')).toBe(0);
    });
  });

  describe('copyChangeInfo', () => {
    it('copies only the defined change info fields', () => {
      const copy = copyChangeInfo(config({ rev: 3, updated_by: 'device-a' }));

      expect(copy).toEqual({ rev: 3, updated_by: 'device-a' });
      expect(Object.keys(copy)).not.toContain('created_at');
    });

    it('gives an empty object without a config', () => {
      expect(copyChangeInfo(undefined)).toEqual({});
      expect(copyChangeInfo(null)).toEqual({});
    });
  });

  describe('stampAdded', () => {
    it('sets all fields and overwrites values copied from another entry', () => {
      const added = config({
        created_at: 1,
        updated_at: 2,
        rev: 7,
        updated_by: 'device-b',
      });

      stampAdded(added, NOW, 'device-a');

      expect(added).toEqual(
        config({
          created_at: NOW,
          updated_at: NOW,
          rev: 1,
          updated_by: 'device-a',
        }),
      );
    });
  });

  describe('stampUpdated with touch', () => {
    it('counts the revision up and keeps created_at', () => {
      const stored = config({
        created_at: 1000,
        updated_at: 2000,
        rev: 2,
        updated_by: 'device-b',
      });
      const updated = { ...stored };

      stampUpdated(copyChangeInfo(stored), updated, NOW, 'device-a', true);

      expect(updated.rev).toBe(3);
      expect(updated.created_at).toBe(1000);
      expect(updated.updated_at).toBe(NOW);
      expect(updated.updated_by).toBe('device-a');
      expect(updated.unix_timestamp).toBe(stored.unix_timestamp);
    });

    it('counts up from the stored revision when the caller holds an outdated object', () => {
      const updated = config({ created_at: 1000, rev: 1 });

      stampUpdated(
        { created_at: 1000, rev: 5 },
        updated,
        NOW,
        'device-a',
        true,
      );

      expect(updated.rev).toBe(6);
    });

    it('counts up from the incoming revision when it is higher', () => {
      const updated = config({ rev: 9 });

      stampUpdated({ rev: 4 }, updated, NOW, 'device-a', true);

      expect(updated.rev).toBe(10);
    });

    it('starts entries without change info at revision 1 and estimates created_at', () => {
      const updated = config();

      stampUpdated({}, updated, NOW, 'device-a', true);

      expect(updated.rev).toBe(1);
      expect(updated.created_at).toBe(1_700_000_000_000);
      expect(updated.updated_at).toBe(NOW);
    });

    it('prefers the stored created_at over the incoming one', () => {
      const updated = config({ created_at: 5000 });

      stampUpdated({ created_at: 1000 }, updated, NOW, 'device-a', true);

      expect(updated.created_at).toBe(1000);
    });

    it('treats invalid revisions as 0', () => {
      const updated = config({ rev: 'x' as unknown as number });

      stampUpdated({ rev: NaN }, updated, NOW, 'device-a', true);

      expect(updated.rev).toBe(1);
    });
  });

  describe('stampUpdated without touch', () => {
    it('keeps the stored change info', () => {
      const stored = {
        created_at: 1000,
        updated_at: 2000,
        rev: 4,
        updated_by: 'device-b',
      };
      const updated = config({ rev: 1, updated_at: 1 });

      stampUpdated(stored, updated, NOW, 'device-a', false);

      expect(updated).toEqual(config(stored));
    });

    it('keeps incoming values the stored entry does not have', () => {
      const updated = config({ rev: 2, updated_by: 'device-b' });

      stampUpdated({}, updated, NOW, 'device-a', false);

      expect(updated).toEqual(config({ rev: 2, updated_by: 'device-b' }));
    });

    it('does not create undefined fields', () => {
      const updated = config();

      stampUpdated({}, updated, NOW, 'device-a', false);

      expect(Object.keys(updated).sort()).toEqual(['unix_timestamp', 'uuid']);
    });
  });

  describe('fillMissingChangeInfo', () => {
    it('fills in missing change info as unknown and estimates created_at', () => {
      const entries: any[] = [
        { config: config() },
        { config: config({ uuid: 'ms', unix_timestamp: 1_700_000_000_123 }) },
        { config: { uuid: 'no-timestamp' } },
      ];

      expect(fillMissingChangeInfo(entries)).toBe(3);

      expect(entries[0].config).toEqual({
        uuid: 'entry-1',
        unix_timestamp: 1_700_000_000,
        created_at: 1_700_000_000_000,
        updated_at: 0,
        rev: 0,
        updated_by: '',
      });
      expect(entries[1].config.created_at).toBe(1_700_000_000_123);
      expect(entries[1].config.unix_timestamp).toBe(1_700_000_000_123);
      expect(entries[2].config).toEqual({
        uuid: 'no-timestamp',
        created_at: 0,
        updated_at: 0,
        rev: 0,
        updated_by: '',
      });
    });

    it('never changes values that are already there', () => {
      const tracked = config({
        created_at: 5,
        updated_at: NOW,
        rev: 7,
        updated_by: 'device-a',
      });
      const partly = config({ uuid: 'partly', rev: 3, updated_at: 0 });
      const entries: any[] = [{ config: tracked }, { config: partly }];

      expect(fillMissingChangeInfo(entries)).toBe(1);

      expect(entries[0].config).toEqual(tracked);
      expect(entries[1].config).toEqual({
        ...config({ uuid: 'partly' }),
        created_at: 1_700_000_000_000,
        updated_at: 0,
        rev: 3,
        updated_by: '',
      });
    });

    it('replaces values of the wrong type', () => {
      const entries: any[] = [
        {
          config: config({
            created_at: '1' as any,
            updated_at: null,
            rev: Number.NaN,
            updated_by: 4 as any,
          }),
        },
      ];

      expect(fillMissingChangeInfo(entries)).toBe(1);

      expect(entries[0].config).toEqual({
        ...config(),
        created_at: 1_700_000_000_000,
        updated_at: 0,
        rev: 0,
        updated_by: '',
      });
    });

    it('changes nothing when it runs again', () => {
      const entries: any[] = [{ config: config() }, { config: config() }];
      fillMissingChangeInfo(entries);
      const filled = structuredClone(entries);

      expect(fillMissingChangeInfo(entries)).toBe(0);
      expect(entries).toEqual(filled);
    });

    it('fills both copies of entries that share a uuid', () => {
      const entries: any[] = [
        { config: config(), note: 'same' },
        { config: config(), note: 'same' },
      ];

      expect(fillMissingChangeInfo(entries)).toBe(2);
      expect(entries[0]).toEqual(entries[1]);
      expect(entries[0].config.rev).toBe(0);
    });

    it('skips and counts entries without a config object', () => {
      const stats: FillChangeInfoStats = { skipped: 0 };
      const entries: any[] = [
        null,
        'text',
        {},
        { config: null },
        { config: [] },
        { config: config() },
      ];

      expect(fillMissingChangeInfo(entries, stats)).toBe(1);
      expect(stats.skipped).toBe(5);
      expect(entries.slice(0, 5)).toEqual([
        null,
        'text',
        {},
        { config: null },
        { config: [] },
      ]);
    });

    it('accepts a value that is not a list', () => {
      expect(fillMissingChangeInfo(undefined as any)).toBe(0);
    });
  });
});
