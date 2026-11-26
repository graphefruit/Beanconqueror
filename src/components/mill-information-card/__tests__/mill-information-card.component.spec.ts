import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { Subject } from 'rxjs';

import { Brew, BrewInstanceHelper } from '../../../classes/brew/brew';
import { Mill } from '../../../classes/mill/mill';
import { Settings } from '../../../classes/settings/settings';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UIImage } from '../../../services/uiImage';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';
import { DeleteCommands } from '../../../stores/delete-commands';
import { MillInformationCardComponent } from '../mill-information-card.component';

function storedBrew(fields: Partial<IBrew>, at: number): object {
  const brew = new Brew();
  Object.assign(brew, fields);
  brew.config.unix_timestamp = at;
  return JSON.parse(JSON.stringify(brew)) as object;
}

/** The brews as `UIBrewStorage` hands them out: stored form and instances. */
class BrewStorageFake {
  public readonly events = new Subject<unknown>();
  private instances: Brew[] = [];

  public constructor(public stored: object[]) {}

  public getRawEntries(): readonly unknown[] {
    return this.stored;
  }

  public getAllEntries(): Brew[] {
    if (this.instances.length <= 0) {
      this.instances = this.stored.map((entry) => {
        const brew = new Brew();
        brew.initializeByObject(entry as IBrew);
        return brew;
      });
    }
    return this.instances;
  }

  public attachOnEvent() {
    return this.events.asObservable();
  }

  public storageReady(): Promise<void> {
    return Promise.resolve();
  }

  public isRead(): boolean {
    return true;
  }

  public change(stored: object[]): void {
    this.stored = stored;
    this.instances = [];
    this.events.next({ type: 'UPDATE' });
  }
}

describe('MillInformationCardComponent - what the brews add up to', () => {
  const stored = [
    storedBrew({ mill: 'm1', bean: 'b1', grind_weight: 0.1 }, 100),
    storedBrew({ mill: 'm2', bean: 'b3', grind_weight: 50 }, 900),
    // The latest time twice: the brew stored first is the last use.
    storedBrew(
      { mill: 'm1', bean: 'b2', grind_weight: 0.2, grind_size: '12' },
      300,
    ),
    storedBrew(
      {
        mill: 'm1',
        bean: 'b1',
        grind_weight: 18,
        grind_size: '7',
        mill_speed: 900,
      },
      300,
    ),
    storedBrew({ mill: 'm1', bean: 'b1', grind_weight: 17.555 }, 200),
    // Fields missing, as in brews of older versions.
    { mill: 'm3', bean: 'gone', config: { uuid: 'x', unix_timestamp: 5 } },
    { mill: 'm3' },
    storedBrew({ mill: 'm4', bean: 'b2', grind_size: '3', mill_speed: 80 }, 10),
  ];
  let brews: BrewStorageFake;

  function card(uuid: string): MillInformationCardComponent {
    const component = TestBed.runInInjectionContext(
      () => new MillInformationCardComponent(),
    );
    component.mill = new Mill();
    component.mill.config.uuid = uuid;
    return component;
  }

  function shown(component: MillInformationCardComponent) {
    return {
      brews: component.brewsCount(),
      weight: component.weightCount(),
      beans: component.beansCount(),
      lastUsed: component.lastUsed(),
      lastGrindSize: component.lastUsedGrindSizeForBrew(),
      lastBean: component.lastUsedBean(),
    };
  }

  beforeEach(() => {
    brews = new BrewStorageFake(stored);
    const beans = {
      getByUUID: (uuid: string) =>
        uuid === '' || uuid === 'gone'
          ? undefined
          : { name: { b1: 'Ethiopia', b2: 'Kenya' }[uuid] ?? uuid },
    } as unknown as UIBeanStorage;
    spyOn(UIBeanStorage, 'getInstance').and.returnValue(beans);
    BrewInstanceHelper.beans = {};

    TestBed.configureTestingModule({
      providers: [
        { provide: UIBrewStorage, useValue: brews },
        { provide: UIBeanStorage, useValue: beans },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => new Settings() },
        },
        {
          provide: UIHelper,
          useValue: {
            toFixedIfNecessary: (value: number, digits: number) =>
              UIHelper.prototype.toFixedIfNecessary(value, digits),
          },
        },
        { provide: ModalController, useValue: {} },
        { provide: UIToast, useValue: {} },
        { provide: UIAlert, useValue: {} },
        { provide: UIMillStorage, useValue: {} },
        { provide: DeleteCommands, useValue: {} },
        { provide: UIAnalytics, useValue: {} },
        { provide: UIImage, useValue: {} },
        { provide: UIBrewHelper, useValue: {} },
      ],
    });
  });

  afterEach(() => {
    BrewInstanceHelper.beans = {};
  });

  it('shows count, weight, beans and the last use of a grinder with brews', () => {
    expect(shown(card('m1'))).toEqual({
      brews: 4,
      weight: 35.86,
      beans: 2,
      lastUsed: 300,
      lastGrindSize: '12',
      lastBean: 'Kenya',
    });
  });

  it('shows the grinder speed with the last grind size when the brew has one', () => {
    expect(shown(card('m4')).lastGrindSize).toBe('3 @ 80');
  });

  it('counts brews of older versions and shows a dash for a bean that is gone', () => {
    expect(shown(card('m3'))).toEqual({
      brews: 2,
      weight: 0,
      beans: 2,
      lastUsed: 5,
      lastGrindSize: '',
      lastBean: '-',
    });
  });

  it('shows dashes for a grinder without brews', () => {
    expect(shown(card('unused'))).toEqual({
      brews: 0,
      weight: 0,
      beans: 0,
      lastUsed: -1,
      lastGrindSize: '-',
      lastBean: '-',
    });
  });

  it('shows the same after other code sorted the brews in place', () => {
    UIBrewHelper.sortBrews(brews.getAllEntries());

    expect(shown(card('m1')).lastBean).toBe('Kenya');
    expect(shown(card('m1')).lastGrindSize).toBe('12');
  });

  it('goes through the brews once for all cards, without building brew instances', () => {
    const many = Array.from({ length: 3000 }, (_, i) =>
      storedBrew({ mill: `m${i % 3}`, bean: `b${i}`, grind_weight: 1 }, i),
    );
    brews.change(many);
    const read = spyOn(brews, 'getRawEntries').and.callThrough();
    const instances = spyOn(brews, 'getAllEntries').and.callThrough();

    const cards = ['m0', 'm1', 'm2'].map((uuid) => shown(card(uuid)));

    expect(cards.map((c) => c.beans)).toEqual([1000, 1000, 1000]);
    expect(cards.map((c) => c.lastUsed)).toEqual([2997, 2998, 2999]);
    expect(read).toHaveBeenCalledTimes(1);
    expect(instances).not.toHaveBeenCalled();
  });

  it('follows the brews', () => {
    const component = card('m2');
    expect(component.brewsCount()).toBe(1);

    brews.change([...stored, storedBrew({ mill: 'm2', bean: 'b1' }, 950)]);

    expect(component.brewsCount()).toBe(2);
    expect(component.lastUsed()).toBe(950);
  });
});
