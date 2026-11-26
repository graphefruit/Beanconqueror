import { TestBed } from '@angular/core/testing';

import { Bean } from '../../../classes/bean/bean';
import { IBean } from '../../../interfaces/bean/iBean';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UILog } from '../../../services/uiLog';
import { FakeStoreSource } from '../../core/__tests__/fake-store-source';
import { BeanStore, ingestBean, toLegacyBean } from '../bean.store';

function storedBean(fields: Partial<IBean>): IBean {
  const bean = new Bean();
  Object.assign(bean, fields);
  return JSON.parse(JSON.stringify(bean)) as IBean;
}

describe('ingestBean', () => {
  it('fills in what an older stored bean does not have, like the bean storage', () => {
    const older = { name: 'Old', config: { uuid: 'a', unix_timestamp: 1 } };

    const bean = ingestBean(JSON.stringify(older));

    const legacy = new Bean();
    legacy.initializeByObject(JSON.parse(JSON.stringify(older)) as IBean);
    expect(bean).toEqual(JSON.parse(JSON.stringify(legacy)) as IBean);
    expect(bean.name).toBe('Old');
  });

  it('returns plain data without the methods of a bean', () => {
    const json = JSON.stringify(
      storedBean({
        name: 'Roasted',
        bean_roast_information: { drop_temperature: 200 } as never,
      }),
    );

    const bean = ingestBean(json);

    expect(bean).not.toBeInstanceOf(Bean);
    expect(Object.getPrototypeOf(bean.bean_roast_information)).toBe(
      Object.prototype,
    );
    expect(bean.bean_roast_information.drop_temperature).toBe(200);
  });
});

describe('toLegacyBean', () => {
  it('hands legacy code a bean it can change without changing the entry', () => {
    const entry = Object.freeze(
      ingestBean(
        JSON.stringify(storedBean({ name: 'Entry', attachments: ['a.jpg'] })),
      ),
    );

    const bean = toLegacyBean(entry);
    bean.attachments.push('b.jpg');
    bean.name = 'Changed';

    expect(bean).toBeInstanceOf(Bean);
    expect(bean.isFrozen()).toBeFalse();
    expect(entry.name).toBe('Entry');
    expect(entry.attachments).toEqual(['a.jpg']);
  });
});

describe('BeanStore', () => {
  let source: FakeStoreSource;

  beforeEach(() => {
    source = new FakeStoreSource();
    TestBed.configureTestingModule({
      providers: [{ provide: UIBeanStorage, useValue: source }],
    });
  });

  it('reads the stored beans and follows their changes', async () => {
    const store = TestBed.inject(BeanStore);
    await source.load([storedBean({ name: 'One' })]);

    expect(store.entries().map((bean) => bean.name)).toEqual(['One']);

    source.change([storedBean({ name: 'One' }), storedBean({ name: 'Two' })]);

    expect(store.entries().map((bean) => bean.name)).toEqual(['One', 'Two']);
  });

  it('shows the other beans when a stored entry is no object', async () => {
    const logError = spyOn(TestBed.inject(UILog), 'error');
    const store = TestBed.inject(BeanStore);
    const one = storedBean({ name: 'One', config: { uuid: 'a' } as never });
    const two = storedBean({ name: 'Two', config: { uuid: 'b' } as never });
    await source.load([one, null, 'broken', two]);

    expect(store.entries().map((bean) => bean.name)).toEqual(['One', 'Two']);
    expect(store.byUuid().size).toBe(2);
    expect(source.entries).toEqual([one, null, 'broken', two]);
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('lists a bean stored with fields set to undefined with the defaults for them', async () => {
    const store = TestBed.inject(BeanStore);
    const ghost = {
      ...storedBean({ name: 'Ghost' }),
      roast: undefined,
      roast_range: undefined,
      decaffeinated: undefined,
    };
    await source.load([ghost]);

    const [bean] = store.entries();
    expect(bean.name).toBe('Ghost');
    expect(bean.roast as string).toBe('UNKNOWN');
    expect(bean.roast_range).toBe(0);
    expect(bean.decaffeinated).toBeFalse();
    // Only read so: the stored entry stays as it is.
    expect(source.entries).toEqual([ghost]);
  });

  it('finds the entries by uuid, of several with one uuid the first', async () => {
    const store = TestBed.inject(BeanStore);
    const one = storedBean({ name: 'One', config: { uuid: 'a' } as never });
    const copy = storedBean({ name: 'Copy', config: { uuid: 'a' } as never });
    const two = storedBean({ name: 'Two', config: { uuid: 'b' } as never });
    await source.load([one, copy, two]);

    expect(store.byUuid().get('a')?.name).toBe('One');
    expect(store.byUuid().get('b')?.name).toBe('Two');
    expect(store.byUuid().get('c')).toBeUndefined();
    expect(store.byUuid().get('b')).toBe(store.entries()[2]);
  });
});
