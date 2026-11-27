import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { BinaryWriter } from '@bufbuild/protobuf/wire';

import { BEAN_SORT_AFTER } from '../../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../../enums/beans/beanSortOrder';
import { BeanProto } from '../../../generated/src/classes/bean/bean';
import { BeanSortFilterHelperService } from '../../../services/beanSortFilterHelper/bean-sort-filter-helper.service';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIHelper } from '../../../services/uiHelper';
import { BeanUsageStore } from '../../../stores/beans/bean-usage.store';
import { MemoryDatabase } from '../../../test-utils/memory-database';
import { Settings } from '../../settings/settings';
import { StorageClass } from '../../storageClass';
import { Bean } from '../bean';

describe('Bean shared protobuf', () => {
  it('preserves half-step roast ratings', () => {
    const bytes = BeanProto.encode({
      name: 'Test bean',
      roast_range: 2.5,
      attachments: [],
      bean_information: [],
      external_images: [],
    }).finish();

    const bean = new Bean();
    bean.initializeBySharedProtoBean(BeanProto.decode(bytes));

    expect(bean.roast_range).toBe(2.5);
  });

  it('reads a legacy integer-encoded roast rating', () => {
    const bytes = new BinaryWriter().uint32(64).uint64(3).finish();

    const bean = new Bean();
    bean.initializeBySharedProtoBean(BeanProto.decode(bytes));

    expect(bean.roast_range).toBe(3);
  });
});

/**
 * A bean as an import of a shared bean stored it before that import was
 * fixed: some fields are set to undefined, which only IndexedDB keeps.
 */
function ghostBean(): Record<string, unknown> {
  const stored = JSON.parse(JSON.stringify(new Bean())) as Record<
    string,
    unknown
  >;
  return {
    ...stored,
    name: 'Kilimbi Honey',
    config: { uuid: 'ghost', unix_timestamp: 1771446629 },
    bean_roasting_type: 'OMNI',
    cupping_points: undefined,
    decaffeinated: undefined,
    ean_article_number: undefined,
    qr_code: undefined,
    roast: undefined,
    roast_custom: undefined,
    roast_range: undefined,
  };
}

describe('Bean stored with fields set to undefined', () => {
  let database: MemoryDatabase;
  let storage: UIBeanStorage;

  beforeEach(async () => {
    database = new MemoryDatabase();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        ...database.providers(),
        UIBeanStorage,
        BeanSortFilterHelperService,
        {
          provide: UIHelper,
          useValue: {
            cloneData: <T>(value: T) => StorageClass.cloneData(value),
          },
        },
        { provide: UIBeanHelper, useValue: {} },
        { provide: BeanUsageStore, useValue: {} },
        { provide: ModalController, useValue: {} },
      ],
    });
    database.values.set('BEANS', [ghostBean()]);
    storage = TestBed.inject(UIBeanStorage);
    await storage.initializeStorage();
  });

  it('is read with the defaults for them and not written', () => {
    const [bean] = storage.getAllEntries();

    expect(bean.name).toBe('Kilimbi Honey');
    expect(bean.bean_roasting_type as string).toBe('OMNI');
    expect(bean.roast as string).toBe('UNKNOWN');
    expect(bean.roast_range).toBe(0);
    expect(bean.roast_custom).toBe('');
    expect(bean.decaffeinated).toBeFalse();
    expect(bean.cupping_points).toBe('');
    expect(bean.ean_article_number).toBe('');
    expect(bean.qr_code).toBe('');
    expect(database.writes('BEANS')).toBe(0);
  });

  it('is listed with the beans the default filter shows', () => {
    const filter = TestBed.inject(BeanSortFilterHelperService);

    const listed = filter.initializeBeansView(
      'open',
      storage.getAllEntries(),
      '',
      {
        sort_after: BEAN_SORT_AFTER.UNKOWN,
        sort_order: BEAN_SORT_ORDER.UNKOWN,
      },
      new Settings().GET_BEAN_FILTER(),
    );

    expect(listed.map((bean) => bean.name)).toEqual(['Kilimbi Honey']);
  });
});
