/** Core */
import { Injectable } from '@angular/core';
/** Classes */
import { Bean } from '../classes/bean/bean';
/** Interfaces */
import { IBean } from '../interfaces/bean/iBean';
/** Services */
import { StorageClass } from '../classes/storageClass';
import { UIHelper } from './uiHelper';
import { UILog } from './uiLog';
import { UIStorage } from './uiStorage';
import { TranslateService } from '@ngx-translate/core';

/** Ionic native */

@Injectable({
  providedIn: 'root',
})
export class UIBeanStorage extends StorageClass {
  /**
   * Singelton instance
   */
  private static instance: UIBeanStorage;

  private beans: Array<Bean> = [];

  public static getInstance(): UIBeanStorage {
    if (UIBeanStorage.instance) {
      return UIBeanStorage.instance;
    }

    return undefined;
  }

  constructor(
    protected uiStorage: UIStorage,
    protected uiHelper: UIHelper,
    protected uiLog: UILog,
    private readonly translate: TranslateService,
  ) {
    super(uiStorage, uiHelper, uiLog, 'BEANS');
    if (UIBeanStorage.instance === undefined) {
      UIBeanStorage.instance = this;
    }
    super.attachOnEvent().subscribe((data) => {
      this.beans = [];
    });
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

    return this.translate.instant('NO_COFFEE_DRUNK');
  }

  public getAllEntries(): Array<Bean> {
    if (this.beans.length <= 0) {
      const beanEntries: Array<any> = super.getAllEntries();
      for (const bean of beanEntries) {
        const beanObj: Bean = new Bean();
        beanObj.initializeByObject(bean);
        this.beans.push(beanObj);
      }
    }
    return this.beans;
  }

  public getEntryByUUID(_uuid: string): Bean {
    const entries: Array<Bean> = this.getAllEntries();
    const entry = entries.find((e) => e.config.uuid === _uuid);
    if (entry) {
      return entry;
    }
    return null;
  }

  public async add(_entry: Bean): Promise<any> {
    _entry.fixDataTypes();
    return await super.add(_entry);
  }

  public async initializeStorage() {
    this.beans = [];
    await super.__initializeStorage();
  }

  public async update(_obj: Bean): Promise<boolean> {
    const promise: Promise<boolean> = new Promise(async (resolve, reject) => {
      _obj.fixDataTypes();
      const val = await super.update(_obj);
      resolve(val);
    });
    return promise;
  }
}
