/** Core */
import { Injectable, inject } from '@angular/core';
/** Ionic native */
/** Classes */
/** Services */

import { StorageClass } from '../classes/storageClass';

import { UIHelper } from './uiHelper';
import { UILog } from './uiLog';
import { UIStorage } from './uiStorage';
import { TranslateService } from '@ngx-translate/core';
import { Water } from '../classes/water/water';

/** Interfaces */

@Injectable({
  providedIn: 'root',
})
export class UIWaterStorage extends StorageClass {
  private readonly translate = inject(TranslateService);

  /**
   * Singelton instance
   */
  public static instance: UIWaterStorage;

  private waters: Array<Water> = [];
  public static getInstance(): UIWaterStorage {
    if (UIWaterStorage.instance) {
      return UIWaterStorage.instance;
    }

    return undefined;
  }
  constructor() {
    super('WATER');

    if (UIWaterStorage.instance === undefined) {
      UIWaterStorage.instance = this;
    }
    super.attachOnEvent().subscribe((data) => {
      this.waters = [];
    });
  }

  public async initializeStorage() {
    this.waters = [];
    await super.__initializeStorage();
  }

  public getAllEntries(): Array<Water> {
    if (this.waters.length <= 0) {
      const entries: Array<any> = super.getAllEntries();
      for (const water of entries) {
        const waterObj: Water = new Water();
        waterObj.initializeByObject(water);
        this.waters.push(waterObj);
      }
    }
    return this.waters;
  }
}
