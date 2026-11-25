import { computed, inject, Service } from '@angular/core';

import { Bean } from '../../classes/bean/bean';
import { IBean } from '../../interfaces/bean/iBean';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UILog } from '../../services/uiLog';
import { CollectionStore } from '../core/collection-store';
import { DeepReadonly, toPlainData } from '../core/read-only';
import { StoreHub } from '../core/store-hub';

/**
 * The stored beans for new code, as read-only plain data. Created with its
 * first use, not at app start.
 */
@Service()
export class BeanStore extends CollectionStore<IBean> {
  /** The entries by uuid; of several with one uuid, the first stored. */
  public readonly byUuid = computed(() => {
    const byUuid = new Map<string, DeepReadonly<IBean>>();
    for (const bean of this.entries()) {
      if (!byUuid.has(bean.config.uuid)) {
        byUuid.set(bean.config.uuid, bean);
      }
    }
    return byUuid;
  });

  public constructor() {
    super(
      inject(UIBeanStorage),
      ingestBean,
      inject(UILog),
      toLegacyBean,
      inject(StoreHub),
    );
  }
}

/**
 * The model fills in what an older entry does not have, exactly as
 * `UIBeanStorage.getAllEntries()` does for legacy code. The result is plain
 * data: a store entry is no `Bean` and has none of its methods.
 */
export function ingestBean(json: string): IBean {
  const bean = new Bean();
  bean.initializeByObject(JSON.parse(json) as IBean);
  return toPlainData<IBean>(bean);
}

/**
 * A deep copy of a store entry as a `Bean`, for legacy code that changes and
 * saves it, and the form in which the store saves a bean.
 */
export function toLegacyBean(entry: DeepReadonly<IBean>): Bean {
  const bean = new Bean();
  bean.initializeByObject(JSON.parse(JSON.stringify(entry)) as IBean);
  return bean;
}
