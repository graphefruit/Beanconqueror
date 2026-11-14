import { inject, Service } from '@angular/core';

import { Bean } from '../../classes/bean/bean';
import { IBean } from '../../interfaces/bean/iBean';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { CollectionStore } from '../core/collection-store';
import { toPlainData } from '../core/read-only';

/**
 * The stored beans for new code, as read-only plain data. Created with its
 * first use, not at app start.
 */
@Service()
export class BeanStore extends CollectionStore<IBean> {
  public constructor() {
    super(inject(UIBeanStorage), ingestBean);
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
