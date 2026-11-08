import { Injectable } from '@angular/core';

import { Brew } from '../classes/brew/brew';
import { StorageClass } from '../classes/storageClass';

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
  protected prepareEntryForStorage(_entry: Brew): Brew {
    _entry.fixDataTypes();
    return StorageClass.cloneData(_entry);
  }
}
