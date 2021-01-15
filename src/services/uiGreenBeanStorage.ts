/** Core */
import {Injectable} from '@angular/core';
/** Classes */
import {Bean} from '../classes/bean/bean';
/** Interfaces */

/** Services */
import {StorageClass} from '../classes/storageClass';
import {UIHelper} from './uiHelper';
import {UILog} from './uiLog';
import {UIStorage} from './uiStorage';
import {TranslateService} from '@ngx-translate/core';
import {IGreenBean} from '../interfaces/green-bean/iGreenBean';
import {GreenBean} from '../classes/green-bean/green-bean';

/** Ionic native */

@Injectable({
  providedIn: 'root'
})
export class UIGreenBeanStorage extends StorageClass {

  /**
   * Singelton instance
   */
  private static instance: UIGreenBeanStorage;

  private beans: Array<GreenBean> = [];

  public static getInstance(): UIGreenBeanStorage {
    if (UIGreenBeanStorage.instance) {
      return UIGreenBeanStorage.instance;
    }
    // noinspection TsLint

    return undefined;
  }

  constructor(protected uiStorage: UIStorage,
              protected uiHelper: UIHelper,
              protected uiLog: UILog,
              private readonly translate: TranslateService) {

    super(uiStorage, uiHelper, uiLog, 'GREEN_BEANS');
    if (UIGreenBeanStorage.instance === undefined) {
      UIGreenBeanStorage.instance = this;
    }
    super.attachOnEvent().subscribe((data) => {
      this.beans = [];
    });
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

  public add(_entry: GreenBean) {
    super.add(_entry);
  }

  public update(_obj: GreenBean): boolean {
    return super.update(_obj);
  }
}
