import { TestBed } from '@angular/core/testing';

import { Bean } from '../../../classes/bean/bean';
import { IBean } from '../../../interfaces/bean/iBean';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { MemoryDatabase } from '../../../test-utils/memory-database';
import { BeanCommands } from '../bean-commands';

const NOW = Date.parse('2026-04-01T09:00:00.000Z');

function storedBean(uuid: string, fields: Partial<IBean> = {}): IBean {
  const bean = new Bean();
  Object.assign(bean, fields);
  bean.config.uuid = uuid;
  bean.config.unix_timestamp = 1_700_000_000;
  return JSON.parse(JSON.stringify(bean)) as IBean;
}

describe('BeanCommands', () => {
  let db: MemoryDatabase;
  let storage: UIBeanStorage;
  let commands: BeanCommands;

  const stored = (uuid: string) =>
    (db.values.get('BEANS') as IBean[]).find((b) => b.config.uuid === uuid);

  beforeEach(async () => {
    spyOn(Date, 'now').and.returnValue(NOW);
    db = new MemoryDatabase();
    TestBed.configureTestingModule({ providers: db.providers() });
    db.values.set('BEANS', [
      storedBean('a', { name: 'Alpha', rating: 2, note: 'old' }),
      storedBean('b', { name: 'Beta', favourite: true, finished: true }),
    ]);
    storage = TestBed.inject(UIBeanStorage);
    await storage.initializeStorage();
    commands = TestBed.inject(BeanCommands);
  });

  /**
   * What the card stored before: the shown bean as a `Bean`, changed and
   * handed to the bean storage.
   */
  async function legacyWrite(uuid: string, change: (bean: Bean) => void) {
    const bean = new Bean();
    bean.initializeByObject(JSON.parse(JSON.stringify(stored(uuid))) as IBean);
    change(bean);
    await storage.update(bean);
    return stored(uuid);
  }

  it('stores a favourite as the bean storage did, with one save', async () => {
    const legacy = await legacyWrite('a', (b) => (b.favourite = true));
    await legacyWrite('a', (b) => (b.favourite = false));
    const writes = db.writes('BEANS');
    const rev = stored('a').config.rev;

    expect(await commands.setFavourite('a', true)).toBeTrue();

    expect(db.writes('BEANS')).toBe(writes + 1);
    const { config, ...fields } = stored('a');
    const { config: legacyConfig, ...legacyFields } = legacy;
    expect(fields).toEqual(legacyFields);
    expect(config.rev).toBe(rev + 1);
    expect(config.created_at).toBe(legacyConfig.created_at);
    expect(config.updated_at).toBe(NOW);
  });

  it('takes a favourite away', async () => {
    expect(await commands.setFavourite('b', false)).toBeTrue();

    expect(stored('b').favourite).toBeFalse();
    expect(stored('b').name).toBe('Beta');
  });

  it('archives with the rating and note given and keeps the rest', async () => {
    expect(await commands.archive('a', 4.5, 'gone')).toBeTrue();

    const bean = stored('a');
    expect([bean.finished, bean.rating, bean.note, bean.name]).toEqual([
      true,
      4.5,
      'gone',
      'Alpha',
    ]);
  });

  it('takes an archived bean back', async () => {
    expect(await commands.unarchive('b')).toBeTrue();

    expect(stored('b').finished).toBeFalse();
    expect(stored('b').favourite).toBeTrue();
  });

  it('stores nothing for a bean that is not stored', async () => {
    const writes = db.writes('BEANS');

    expect(await commands.setFavourite('x', true)).toBeFalse();
    expect(await commands.unarchive('x')).toBeFalse();

    expect(db.writes('BEANS')).toBe(writes);
  });

  it('leaves the bean as it was when it could not be saved', async () => {
    db.failingWrites.add('BEANS');

    expect(await commands.archive('a', 5, 'lost')).toBeFalse();

    expect(stored('a').finished).toBeFalse();
    expect(storage.getEntryByUUID('a').note).toBe('old');
  });
});
