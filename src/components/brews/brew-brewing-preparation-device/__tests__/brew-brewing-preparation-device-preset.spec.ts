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
import { BrewBrewingComponent } from '../../brew-brewing/brew-brewing.component';
import { BrewBrewingPreparationDeviceComponent } from '../brew-brewing-preparation-device.component';

function brew(
  uuid: string,
  type: PreparationDeviceType,
  profile: string,
  time: number,
) {
  const entry = new Brew();
  entry.config.uuid = uuid;
  entry.config.unix_timestamp = time;
  entry.preparationDeviceBrew.type = type;
  entry.preparationDeviceBrew.params = { chosenProfileId: profile };
  return entry;
}

/** The private methods that preset the form when a machine is connected. */
interface Presetting {
  instanceXeniaPreparationDevice(device: unknown, brew?: Brew): Promise<void>;
  instanceMove2PreparationDevice(device: unknown, brew?: Brew): Promise<void>;
  instanceMeticulousPreparationDevice(
    device: unknown,
    brew?: Brew,
  ): Promise<void>;
  instanceSanremoYOUPreparationDevice(
    device: unknown,
    brew?: Brew,
  ): Promise<void>;
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
  const move2 = {
    connect: (_connected: () => void, failed: () => void) => failed(),
    destroy: () => undefined,
  };
  const xenia = {
    deviceConnected: () => Promise.resolve(),
    getScripts: () => Promise.resolve([]),
    mapScriptsAndSaveTemp: () => undefined,
    scriptList: [],
  };

  beforeEach(() => {
    brews = [
      brew('1', PreparationDeviceType.METICULOUS, 'first', 100),
      brew('2', PreparationDeviceType.SANREMO_YOU, 'sanremo', 200),
      brew('3', PreparationDeviceType.METICULOUS, 'last', 300),
      brew('4', PreparationDeviceType.NONE, 'none', 400),
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
            setLoadingSpinnerMessage: () => Promise.resolve(),
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
    component.brewComponent = {
      timer: { isTimerRunning: () => false },
    } as BrewBrewingComponent;
  });

  it('takes the settings of the newest brew that used the machine', async () => {
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

  it('takes the newest brew with the machine while the array is sorted newest first', async () => {
    // The dashboard and the brew form sort the array of the storage in place.
    brews.reverse();

    await (
      component as unknown as Presetting
    ).instanceMeticulousPreparationDevice(meticulous);

    expect(component.data.preparationDeviceBrew.params).toEqual({
      chosenProfileId: 'last',
    });
  });

  it('takes the later brew in the array of two with the same time', async () => {
    brews = [
      brew('3', PreparationDeviceType.METICULOUS, 'last', 300),
      brew('5', PreparationDeviceType.METICULOUS, 'saved last', 300),
      brew('1', PreparationDeviceType.METICULOUS, 'first', 100),
    ];

    await (
      component as unknown as Presetting
    ).instanceMeticulousPreparationDevice(meticulous);

    expect(component.data.preparationDeviceBrew.params).toEqual({
      chosenProfileId: 'saved last',
    });
  });

  const oddTimes: { name: string; times: unknown[] }[] = [
    {
      name: 'a brew without a time stands first',
      times: [undefined, 100, 300],
    },
    {
      name: 'a brew with a time that is no number stands first',
      times: [NaN, 300],
    },
    {
      name: 'an older brew has its time in milliseconds',
      times: [1_600_000_000_000, 1_700_000_000],
    },
    { name: 'the times are stored as text', times: ['999', '1000'] },
  ];

  for (const odd of oddTimes) {
    it(`takes the newest brew when ${odd.name}`, async () => {
      brews = odd.times.map((time, index) =>
        brew(
          `${index}`,
          PreparationDeviceType.METICULOUS,
          index === odd.times.length - 1 ? 'last' : 'older',
          time as number,
        ),
      );

      await (
        component as unknown as Presetting
      ).instanceMeticulousPreparationDevice(meticulous);

      expect(component.data.preparationDeviceBrew.params).toEqual({
        chosenProfileId: 'last',
      });
    });
  }

  it('skips a brew that has no machine settings at all', async () => {
    const without = brew('0', PreparationDeviceType.NONE, 'none', 50);
    without.preparationDeviceBrew = undefined;
    brews.unshift(without);

    await (
      component as unknown as Presetting
    ).instanceMeticulousPreparationDevice(meticulous);

    expect(component.data.preparationDeviceBrew.params).toEqual({
      chosenProfileId: 'last',
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
    brews = [brew('4', PreparationDeviceType.NONE, 'none', 400)];

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

  const machines: {
    name: string;
    type: PreparationDeviceType;
    preset: (template: Brew) => Promise<void>;
  }[] = [
    {
      name: 'Xenia',
      type: PreparationDeviceType.XENIA,
      preset: (template) =>
        (component as unknown as Presetting).instanceXeniaPreparationDevice(
          xenia,
          template,
        ),
    },
    {
      name: 'Move 2',
      type: PreparationDeviceType.MOVE2,
      preset: (template) =>
        (component as unknown as Presetting).instanceMove2PreparationDevice(
          move2,
          template,
        ),
    },
    {
      name: 'Meticulous',
      type: PreparationDeviceType.METICULOUS,
      preset: (template) =>
        (
          component as unknown as Presetting
        ).instanceMeticulousPreparationDevice(meticulous, template),
    },
    {
      name: 'Sanremo YOU',
      type: PreparationDeviceType.SANREMO_YOU,
      preset: (template) =>
        (
          component as unknown as Presetting
        ).instanceSanremoYOUPreparationDevice(sanremo, template),
    },
  ];

  for (const machine of machines) {
    it(`leaves the brew it was handed alone when a setting changes in the form (${machine.name})`, async () => {
      const template = brew('9', machine.type, 'template', 500);

      await machine.preset(template);

      expect(component.data.preparationDeviceBrew.type).toBe(machine.type);
      expect(component.data.preparationDeviceBrew.params).toEqual({
        chosenProfileId: 'template',
      });
      component.data.preparationDeviceBrew.params.chosenProfileId = 'changed';
      expect(template.preparationDeviceBrew.params).toEqual({
        chosenProfileId: 'template',
      });
    });
  }

  it('keeps the settings of the brew itself while it is edited', async () => {
    component.isEdit = true;
    component.data = brew('9', PreparationDeviceType.METICULOUS, 'own', 500);
    const params: unknown = component.data.preparationDeviceBrew.params;

    await (
      component as unknown as Presetting
    ).instanceMeticulousPreparationDevice(meticulous, component.data);

    expect(component.data.preparationDeviceBrew.params).toBe(params);
  });

  it('does not take the settings of another brew while a brew is edited', async () => {
    component.isEdit = true;

    await (
      component as unknown as Presetting
    ).instanceMeticulousPreparationDevice(meticulous);

    expect(component.data.preparationDeviceBrew.type).toBe(
      PreparationDeviceType.METICULOUS,
    );
    expect(component.data.preparationDeviceBrew.params.chosenProfileId).toBe(
      '',
    );
    expect(cloneData).not.toHaveBeenCalled();
  });
});
