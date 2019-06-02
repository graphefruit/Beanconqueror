/** Core */
import { Injectable } from '@angular/core';
/** Ionic native */

/** Classes */
import { Bean } from '../classes/bean/bean';

/** Interfaces */
import { IBean } from '../interfaces/bean/iBean';

/** Services */
import { StorageClass } from  '../classes/storageClass';
import { UIHelper } from '../services/uiHelper';
import { UILog } from '../services/uiLog';
import { UIStorage } from  '../services/uiStorage';

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
    if (UIBeanStorage.instance == undefined) {
      UIBeanStorage.instance = this;
    }
  }

  public getBeanNameByUUID(_uuid: string): string {
    if (_uuid.toLowerCase() === 'standard') {
      return 'Standard';
    } else {
      const entries: Array<IBean> = this.getAllEntries();
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].config.uuid === _uuid) {
          return entries[i].name;
        }
      }

      return '_nicht gefunden_';
    }
  }

  public getAllEntries(): Array<Bean> {
    const beanEntries: Array<any> = super.getAllEntries();
    const beans: Array<Bean> = [];

    for (let i = 0; i < beanEntries.length; i++) {
      const beanObj: Bean = new Bean();
      beanObj.initializeByObject(beanEntries[i]);
      beans.push(beanObj);

    }
    return beans;
  }
}
