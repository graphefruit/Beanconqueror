/** Core */
import {Injectable} from '@angular/core';
/** Ionic native */
/** Classes */
/** Services */
import {Mill} from '../classes/mill/mill';
import {StorageClass} from '../classes/storageClass';
import {IMill} from '../interfaces/mill/iMill';
import {UIHelper} from './uiHelper';
import {UILog} from './uiLog';
import {UIStorage} from './uiStorage';
import {TranslateService} from '@ngx-translate/core';

/** Interfaces */

@Injectable({
  providedIn: 'root'
})
export class UIMillStorage extends StorageClass {


  /**
   * Singelton instance
   */
  public static instance: UIMillStorage;

  private mills: Array<Mill> = [];
  public static getInstance(): UIMillStorage {
    if (UIMillStorage.instance) {
      return UIMillStorage.instance;
    }

    return undefined;
  }
  constructor(protected uiStorage: UIStorage,
              protected uiHelper: UIHelper,
              protected uiLog: UILog,
              private readonly translate: TranslateService) {
    super(uiStorage, uiHelper, uiLog, 'MILL');
    if (UIMillStorage.instance === undefined) {
      UIMillStorage.instance = this;
    }
    super.attachOnEvent().subscribe((data) => {
      this.mills = [];
    });
  }

  public getMillNameByUUID(_uuid: string): string {
    if (_uuid.toLowerCase() === 'standard') {
      return 'Standard';
    }

    const entries: Array<IMill> = this.getAllEntries();
    for (const mill of entries) {
      if (mill.config.uuid === _uuid) {
        return mill.name;
      }
    }

    return this.translate.instant('NO_COFFEE_DRUNK');
  }

  public getAllEntries(): Array<Mill> {
    if (this.mills.length <= 0) {
      const entries: Array<any> = super.getAllEntries();
      for (const mill of entries) {
        const millObj: Mill = new Mill();
        millObj.initializeByObject(mill);
        this.mills.push(millObj);

      }
    }
    return this.mills;
  }

}
