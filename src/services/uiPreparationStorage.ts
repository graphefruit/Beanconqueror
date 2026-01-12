import { Injectable, inject } from '@angular/core';
import { Preparation } from '../classes/preparation/preparation';
import { StorageClass } from '../classes/storageClass';
import { IPreparation } from '../interfaces/preparation/iPreparation';
import { UIHelper } from './uiHelper';
import { UILog } from './uiLog';
import { UIStorage } from './uiStorage';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class UIPreparationStorage extends StorageClass {
  private readonly translate = inject(TranslateService);

  /**
   * Singelton instance
   */
  public static instance: UIPreparationStorage;

  private preparations: Array<Preparation> = [];
  public static getInstance(): UIPreparationStorage {
    if (UIPreparationStorage.instance) {
      return UIPreparationStorage.instance;
    }

    return undefined;
  }
  constructor() {
    super('PREPARATION');

    if (UIPreparationStorage.instance === undefined) {
      UIPreparationStorage.instance = this;
    }

    super.attachOnEvent().subscribe((data) => {
      this.preparations = [];
    });
  }

  public getPreparationNameByUUID(_uuid: string): string {
    if (_uuid.toLowerCase() === 'standard') {
      return 'Standard';
    }

    const entries: Array<IPreparation> = this.getAllEntries();
    for (const prep of entries) {
      if (prep.config.uuid === _uuid) {
        return prep.name;
      }
    }

    return this.translate.instant('NO_COFFEE_DRUNK');
  }

  public async initializeStorage() {
    this.preparations = [];
    await super.__initializeStorage();
  }

  public getAllEntries(): Array<Preparation> {
    if (this.preparations.length <= 0) {
      const preparationEntries: Array<any> = super.getAllEntries();
      for (const prep of preparationEntries) {
        const preparationObj: Preparation = new Preparation();
        preparationObj.initializeByObject(prep);
        this.preparations.push(preparationObj);
      }
    }
    return this.preparations;
  }
}
