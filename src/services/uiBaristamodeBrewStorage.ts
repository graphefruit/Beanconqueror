import { Injectable } from '@angular/core';

import BaristamodeBrew from '../classes/brew/baristamodeBrew';
import { StorageClass } from '../classes/storageClass';

@Injectable({
  providedIn: 'root',
})
export class UIBaristamodeBrewStorage extends StorageClass {
  /**
   * Singelton instance
   */
  public static instance: UIBaristamodeBrewStorage;

  private baristamodeBrews: Array<BaristamodeBrew> = [];

  public static getInstance(): UIBaristamodeBrewStorage {
    if (UIBaristamodeBrewStorage.instance) {
      return UIBaristamodeBrewStorage.instance;
    }

    return undefined;
  }

  constructor() {
    super('BARISTAMODE_BREWS');

    if (UIBaristamodeBrewStorage.instance === undefined) {
      UIBaristamodeBrewStorage.instance = this;
    }
    super.attachOnEvent().subscribe((data) => {
      this.baristamodeBrews = [];
    });
  }

  public getAllEntries(): Array<BaristamodeBrew> {
    if (this.baristamodeBrews.length <= 0) {
      const brewEntries: Array<any> = super.getAllEntries();
      for (const brew of brewEntries) {
        const brewObj: BaristamodeBrew = new BaristamodeBrew();
        brewObj.initializeByObject(brew);
        this.baristamodeBrews.push(brewObj);
      }
    }
    return this.baristamodeBrews;
  }

  public getEntryByUUID(_uuid: string): BaristamodeBrew {
    const brewEntries: Array<any> = super.getAllEntries();
    const brewEntry = brewEntries.find((e) => e.config.uuid === _uuid);
    if (brewEntry) {
      const brewObj: BaristamodeBrew = new BaristamodeBrew();
      brewObj.initializeByObject(brewEntry);
      return brewObj;
    }
    return null;
  }

  public async initializeStorage() {
    this.baristamodeBrews = [];
    await super.__initializeStorage();
  }
  public async add(_entry: BaristamodeBrew): Promise<any> {
    const addEntry = StorageClass.cloneData(_entry);
    return await super.add(addEntry);
  }

  public async update(_obj: BaristamodeBrew): Promise<boolean> {
    const updatingObj = StorageClass.cloneData(_obj);
    return await super.update(updatingObj);
  }
}
