/** Core */
import { Injectable } from '@angular/core';
/** Class */
import { Brew, BrewInstanceHelper } from '../classes/brew/brew';
/** Services */
import { StorageClass } from '../classes/storageClass';
import { UIHelper } from './uiHelper';
import { UILog } from './uiLog';
import { UIStorage } from './uiStorage';

@Injectable({
  providedIn: 'root',
})
export class UIBrewStorage extends StorageClass {
  /**
   * Singelton instance
   */
  public static instance: UIBrewStorage;

  private brews: Array<Brew> = [];

  public static getInstance(): UIBrewStorage {
    if (UIBrewStorage.instance) {
      return UIBrewStorage.instance;
    }

    return undefined;
  }

  constructor(
    protected uiStorage: UIStorage,
    protected uiHelper: UIHelper,
    protected uiLog: UILog
  ) {
    super(uiStorage, uiHelper, uiLog, 'BREWS');

    if (UIBrewStorage.instance === undefined) {
      UIBrewStorage.instance = this;
    }
    super.attachOnEvent().subscribe((data) => {
      this.brews = [];
    });
  }

  public getAllEntries(): Array<Brew> {
    if (this.brews.length <= 0) {
      const brewEntries: Array<any> = super.getAllEntries();
      for (const brew of brewEntries) {
        const brewObj: Brew = new Brew();
        brewObj.initializeByObject(brew);
        this.brews.push(brewObj);
      }
    }
    return this.brews;
  }

  public getEntryByUUID(_uuid: string): Brew {
    const brewEntries: Array<any> = super.getAllEntries();
    const brewEntry = brewEntries.find((e) => e.config.uuid === _uuid);
    if (brewEntry) {
      const brewObj: Brew = new Brew();
      brewObj.initializeByObject(brewEntry);
      return brewObj;
    }
    return null;
  }

  public async initializeStorage() {
    this.brews = [];
    await super.__initializeStorage();
  }
  public async add(_entry: Brew): Promise<any> {
    _entry.fixDataTypes();
    //We cache objects, it should be enough to zero it back when adding/editing something
    BrewInstanceHelper.setEntryAmountBackToZero();
    return await super.add(_entry);
  }

  public async update(_obj: Brew): Promise<boolean> {
    const promise: Promise<any> = new Promise(async (resolve, reject) => {
      _obj.fixDataTypes();
      //We cache objects, it should be enough to zero it back when adding/editing something
      BrewInstanceHelper.setEntryAmountBackToZero();
      const updateval: boolean = await super.update(_obj);
      resolve(updateval);
    });
    return promise;
  }
}
