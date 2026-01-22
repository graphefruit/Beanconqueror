import { inject, Injectable } from '@angular/core';

import { Brew } from '../classes/brew/brew';
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

  constructor() {
    super('BREWS');

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
    const addEntry = this.uiHelper.cloneData(_entry);
    return await super.add(addEntry);
  }

  public async update(_obj: Brew): Promise<boolean> {
    const promise: Promise<any> = new Promise(async (resolve, reject) => {
      _obj.fixDataTypes();

      const updatingObj = this.uiHelper.cloneData(_obj);
      const updateval: boolean = await super.update(updatingObj);
      resolve(updateval);
    });
    return promise;
  }
}
