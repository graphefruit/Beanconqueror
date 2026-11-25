import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { Brew } from '../../../classes/brew/brew';
import { Preparation } from '../../../classes/preparation/preparation';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UIImage } from '../../../services/uiImage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';
import { DeleteCommands } from '../../../stores/delete-commands';
import { PreparationInformationCardComponent } from '../preparation-information-card.component';

function storedBrew(fields: Partial<IBrew>): object {
  const brew = new Brew();
  Object.assign(brew, fields);
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

describe('PreparationInformationCardComponent - what the brews add up to', () => {
  const p1 = { method_of_preparation: 'p1' };
  const stored = [
    storedBrew({ ...p1, bean: 'b1', grind_weight: 0.1, brew_quantity: 250 }),
    storedBrew({ method_of_preparation: 'p2', bean: 'b3', grind_weight: 50 }),
    // The beverage quantity counts where there is one.
    storedBrew({
      ...p1,
      bean: 'b2',
      grind_weight: 0.2,
      brew_quantity: 300,
      brew_beverage_quantity: 36.4,
    }),
    storedBrew({ ...p1, bean: 'b1', grind_weight: 17.555, brew_quantity: 41 }),
    // Fields missing, as in brews of older versions.
    { method_of_preparation: 'p3', bean: 'b1' },
    { method_of_preparation: 'p3' },
  ];
  let brews: BrewStorageFake;

  function card(uuid: string): PreparationInformationCardComponent {
    const component = TestBed.runInInjectionContext(
      () => new PreparationInformationCardComponent(),
    );
    component.preparation = new Preparation();
    component.preparation.config.uuid = uuid;
    return component;
  }

  function shown(component: PreparationInformationCardComponent) {
    return {
      brews: component.brewsCount(),
      weight: component.weightCount(),
      drunk: component.drunkenQuantity(),
      beans: component.beansCount(),
    };
  }

  beforeEach(() => {
    brews = new BrewStorageFake(stored);
    TestBed.configureTestingModule({
      providers: [
        { provide: UIBrewStorage, useValue: brews },
        {
          provide: UIHelper,
          useValue: {
            toFixedIfNecessary: (value: number, digits: number) =>
              UIHelper.prototype.toFixedIfNecessary(value, digits),
          },
        },
        { provide: UISettingsStorage, useValue: {} },
        { provide: ModalController, useValue: {} },
        { provide: UIToast, useValue: {} },
        { provide: UIAlert, useValue: {} },
        { provide: UIPreparationStorage, useValue: {} },
        { provide: DeleteCommands, useValue: {} },
        { provide: UIAnalytics, useValue: {} },
        { provide: UIImage, useValue: {} },
        { provide: UIBrewHelper, useValue: {} },
        { provide: TranslateService, useValue: {} },
        { provide: HttpClient, useValue: {} },
      ],
    });
  });

  it('shows count, weight, quantity and beans of a method with brews', () => {
    expect(shown(card('p1'))).toEqual({
      brews: 3,
      weight: 17.86,
      drunk: 0.33,
      beans: 2,
    });
  });

  it('counts brews of older versions', () => {
    expect(shown(card('p3'))).toEqual({
      brews: 2,
      weight: 0,
      drunk: 0,
      beans: 2,
    });
  });

  it('shows zeros for a method without brews', () => {
    expect(shown(card('unused'))).toEqual({
      brews: 0,
      weight: 0,
      drunk: 0,
      beans: 0,
    });
  });

  it('goes through the brews once for all cards, without building brew instances', () => {
    const many = Array.from({ length: 3000 }, (_, i) =>
      storedBrew({
        method_of_preparation: `p${i % 3}`,
        bean: `b${i}`,
        brew_quantity: 100,
      }),
    );
    brews.change(many);
    const read = spyOn(brews, 'getRawEntries').and.callThrough();
    const instances = spyOn(brews, 'getAllEntries').and.callThrough();

    const cards = ['p0', 'p1', 'p2'].map((uuid) => shown(card(uuid)));

    expect(cards.map((c) => c.beans)).toEqual([1000, 1000, 1000]);
    expect(cards.map((c) => c.drunk)).toEqual([100, 100, 100]);
    expect(read).toHaveBeenCalledTimes(1);
    expect(instances).not.toHaveBeenCalled();
  });

  it('follows the brews', () => {
    const component = card('p2');
    expect(component.brewsCount()).toBe(1);

    brews.change([...stored, storedBrew({ method_of_preparation: 'p2' })]);

    expect(component.brewsCount()).toBe(2);
  });
});
