import { inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { GreenBean } from '../classes/green-bean/green-bean';
import { StorageClass } from '../classes/storageClass';
import { IGreenBean } from '../interfaces/green-bean/iGreenBean';
import { UIHelper } from './uiHelper';
import { UILog } from './uiLog';
import { UIStorage } from './uiStorage';

@Injectable({
  providedIn: 'root',
})
export class UIGreenBeanStorage extends StorageClass {
  private readonly translate = inject(TranslateService);

  /**
   * Singelton instance
   */
  private static instance: UIGreenBeanStorage;

  private beans: Array<GreenBean> = [];

  public static getInstance(): UIGreenBeanStorage {
    if (UIGreenBeanStorage.instance) {
      return UIGreenBeanStorage.instance;
    }

    return undefined;
  }

  constructor() {
    super('GREEN_BEANS');

    if (UIGreenBeanStorage.instance === undefined) {
      UIGreenBeanStorage.instance = this;
    }
    super.attachOnEvent().subscribe((data) => {
      this.beans = [];
    });
  }

  public async initializeStorage() {
    this.beans = [];
    await super.__initializeStorage();
  }

  public getBeanNameByUUID(_uuid: string): string {
    if (_uuid.toLowerCase() === 'standard') {
      return 'Standard';
    }

    const entries: Array<IGreenBean> = this.getAllEntries();
    for (const bean of entries) {
      if (bean.config.uuid === _uuid) {
        return bean.name;
      }
    }

    return this.translate.instant('NO_COFFEE_DRUNK');
  }

  public getAllEntries(): Array<GreenBean> {
    if (this.beans.length <= 0) {
      const beanEntries: Array<any> = super.getAllEntries();
      for (const bean of beanEntries) {
        const beanObj: GreenBean = new GreenBean();
        beanObj.initializeByObject(bean);
        this.beans.push(beanObj);
      }
    }
    return this.beans;
  }
}
