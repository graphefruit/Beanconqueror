import { inject, Injectable } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { RoastingMachine } from '../classes/roasting-machine/roasting-machine';
import { StorageClass } from '../classes/storageClass';
import { IRoastingMachine } from '../interfaces/roasting-machine/iRoastingMachine';
import { UIHelper } from './uiHelper';
import { UILog } from './uiLog';
import { UIStorage } from './uiStorage';

@Injectable({
  providedIn: 'root',
})
export class UIRoastingMachineStorage extends StorageClass {
  private readonly translate = inject(TranslateService);

  /**
   * Singelton instance
   */
  private static instance: UIRoastingMachineStorage;

  private roastingMachines: Array<RoastingMachine> = [];

  public static getInstance(): UIRoastingMachineStorage {
    if (UIRoastingMachineStorage.instance) {
      return UIRoastingMachineStorage.instance;
    }

    return undefined;
  }

  constructor() {
    super('ROASTING_MACHINES');

    if (UIRoastingMachineStorage.instance === undefined) {
      UIRoastingMachineStorage.instance = this;
    }
    super.attachOnEvent().subscribe((data) => {
      this.roastingMachines = [];
    });
  }

  public getMachineNameByUUID(_uuid: string): string {
    if (_uuid.toLowerCase() === 'standard') {
      return 'Standard';
    }

    const entries: Array<IRoastingMachine> = this.getAllEntries();
    for (const machine of entries) {
      if (machine.config.uuid === _uuid) {
        return machine.name;
      }
    }

    return this.translate.instant('NO_COFFEE_DRUNK');
  }

  public async initializeStorage() {
    this.roastingMachines = [];
    await super.__initializeStorage();
  }

  public getAllEntries(): Array<RoastingMachine> {
    if (this.roastingMachines.length <= 0) {
      const machineEntry: Array<any> = super.getAllEntries();
      for (const machine of machineEntry) {
        const machineObj: RoastingMachine = new RoastingMachine();
        machineObj.initializeByObject(machine);
        this.roastingMachines.push(machineObj);
      }
    }
    return this.roastingMachines;
  }
}
