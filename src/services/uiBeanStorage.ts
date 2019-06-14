/** Core */
import {Injectable} from '@angular/core';
/** Classes */
import {Bean} from '../classes/bean/bean';
/** Interfaces */
import {IBean} from '../interfaces/bean/iBean';
/** Services */
import {StorageClass} from '../classes/storageClass';
import {UIHelper} from './uiHelper';
import {UILog} from './uiLog';
import {UIStorage} from './uiStorage';

/** Ionic native */

@Injectable()
export class UIBeanStorage extends StorageClass {

  /**
   * Singelton instance
   */
  private static instance: UIBeanStorage;

  public static getInstance(): UIBeanStorage {
    if (UIBeanStorage.instance) {
      return UIBeanStorage.instance;
    }
    // noinspection TsLint

    return undefined;
  }

  constructor(protected uiStorage: UIStorage,
              protected uiHelper: UIHelper,
              protected uiLog: UILog) {

    super(uiStorage, uiHelper, uiLog, 'BEANS');
    if (UIBeanStorage.instance === undefined) {
      UIBeanStorage.instance = this;
    }
  }

  public getBeanNameByUUID(_uuid: string): string {
    if (_uuid.toLowerCase() === 'standard') {
      return 'Standard';
    }

    const entries: Array<IBean> = this.getAllEntries();
    for (const bean of entries) {
      if (bean.config.uuid === _uuid) {
        return bean.name;
      }
    }

    return '_nicht gefunden_';
  }

  public getAllEntries(): Array<Bean> {
    const beanEntries: Array<any> = super.getAllEntries();
    const beans: Array<Bean> = [];

    for (const bean of beanEntries) {
      const beanObj: Bean = new Bean();
      beanObj.initializeByObject(bean);
      beans.push(beanObj);

    }

    return beans;
  }
}
