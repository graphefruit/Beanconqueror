import { TestBed } from '@angular/core/testing';

import { Bean } from '../../../classes/bean/bean';
import { IBean } from '../../../interfaces/bean/iBean';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { FakeStoreSource } from '../../core/__tests__/fake-store-source';
import { BeanStore, ingestBean } from '../bean.store';

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
});
