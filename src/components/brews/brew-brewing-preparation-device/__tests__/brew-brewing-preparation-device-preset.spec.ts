import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { Brew } from '../../../../classes/brew/brew';
import { PreparationDeviceType } from '../../../../classes/preparationDevice';
import { StorageClass } from '../../../../classes/storageClass';
import { EventQueueService } from '../../../../services/queueService/queue-service.service';
import { UIAlert } from '../../../../services/uiAlert';
import { UIBeanStorage } from '../../../../services/uiBeanStorage';
import { UIBrewHelper } from '../../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../../services/uiBrewStorage';
import { UIHelper } from '../../../../services/uiHelper';
import { UIPreparationHelper } from '../../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { UIToast } from '../../../../services/uiToast';
import { BrewBrewingPreparationDeviceComponent } from '../brew-brewing-preparation-device.component';

function brew(uuid: string, type: PreparationDeviceType, profile: string) {
  const entry = new Brew();
  entry.config.uuid = uuid;
  entry.preparationDeviceBrew.type = type;
  entry.preparationDeviceBrew.params = { chosenProfileId: profile };
  return entry;
}

/** The private methods that preset the form when a machine is connected. */
interface Presetting {
  instanceMeticulousPreparationDevice(device: unknown): Promise<void>;
  instanceSanremoYOUPreparationDevice(device: unknown): Promise<void>;
}

describe('BrewBrewingPreparationDeviceComponent - settings of the last brew with the machine', () => {
  let brews: Brew[];
  let cloneData: jasmine.Spy;
  let component: BrewBrewingPreparationDeviceComponent;

  const meticulous = {
    connectToSocket: () => Promise.resolve(false),
  };
  const sanremo = {
    deviceConnected: () => Promise.reject(new Error('not reachable')),
  };

  beforeEach(() => {
    // The order of the storage's array, whatever sorted it last.
    brews = [
      brew('1', PreparationDeviceType.METICULOUS, 'first'),
      brew('2', PreparationDeviceType.SANREMO_YOU, 'sanremo'),
      brew('3', PreparationDeviceType.METICULOUS, 'last'),
      brew('4', PreparationDeviceType.NONE, 'none'),
    ];
    cloneData = jasmine
      .createSpy('cloneData')
      .and.callFake((value: unknown) => StorageClass.cloneData(value));

    TestBed.configureTestingModule({
      providers: [
        { provide: UIBrewStorage, useValue: { getAllEntries: () => brews } },
        { provide: UIHelper, useValue: { cloneData } },
        {
          provide: UIAlert,
          useValue: {
            showLoadingSpinner: () => Promise.resolve(),
            hideLoadingSpinner: () => Promise.resolve(),
            showMessage: () => Promise.resolve(),
          },
        },
        { provide: UIPreparationHelper, useValue: {} },
        { provide: UIBeanStorage, useValue: {} },
        { provide: UIToast, useValue: {} },
        { provide: UISettingsStorage, useValue: {} },
        { provide: UIPreparationStorage, useValue: {} },
        { provide: ChangeDetectorRef, useValue: {} },
        { provide: ModalController, useValue: {} },
        { provide: UIBrewHelper, useValue: {} },
        { provide: EventQueueService, useValue: {} },
      ],
    });
    component = TestBed.runInInjectionContext(
      () => new BrewBrewingPreparationDeviceComponent(),
    );
    component.data = new Brew();
  });

  it('takes the settings of the last brew in the array that used the machine', async () => {
    await (
      component as unknown as Presetting
    ).instanceMeticulousPreparationDevice(meticulous);

    expect(component.data.preparationDeviceBrew.type).toBe(
      PreparationDeviceType.METICULOUS,
    );
    expect(component.data.preparationDeviceBrew.params).toEqual({
      chosenProfileId: 'last',
    });
  });

  it('takes the oldest brew with the machine while the array is sorted newest first', async () => {
    // The dashboard and the brew form sort the array of the storage in place.
    brews.reverse();

    await (
      component as unknown as Presetting
    ).instanceMeticulousPreparationDevice(meticulous);

    expect(component.data.preparationDeviceBrew.params).toEqual({
      chosenProfileId: 'first',
    });
  });

  it('gives the form a copy, so that changing it leaves the stored brew alone', async () => {
    await (
      component as unknown as Presetting
    ).instanceSanremoYOUPreparationDevice(sanremo);

    expect(component.data.preparationDeviceBrew).not.toBe(
      brews[1].preparationDeviceBrew,
    );
    expect(component.data.preparationDeviceBrew.params).not.toBe(
      brews[1].preparationDeviceBrew.params,
    );
    component.data.preparationDeviceBrew.params.chosenProfileId = 'changed';
    expect(brews[1].preparationDeviceBrew.params).toEqual({
      chosenProfileId: 'sanremo',
    });
  });

  it('keeps the new settings when no brew used the machine', async () => {
    brews = [brew('4', PreparationDeviceType.NONE, 'none')];

    await (
      component as unknown as Presetting
    ).instanceSanremoYOUPreparationDevice(sanremo);

    expect(component.data.preparationDeviceBrew.type).toBe(
      PreparationDeviceType.SANREMO_YOU,
    );
    expect(
      component.data.preparationDeviceBrew.params.chosenProfileId,
    ).not.toBe('none');
  });

  it('copies the settings it takes and not every brew, and leaves the array as it is', async () => {
    const order = [...brews];

    await (
      component as unknown as Presetting
    ).instanceMeticulousPreparationDevice(meticulous);

    expect(cloneData.calls.allArgs()).toEqual([
      [order[2].preparationDeviceBrew],
    ]);
    expect(brews).toEqual(order);
  });
});
