import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { Settings } from '../../classes/settings/settings';
import { PreparationSortFilterHelperService } from '../../services/preparationSortFilterHelper/preparation-sort-filter-helper.service';
import { UIMillHelper } from '../../services/uiMillHelper';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIPreparationHelper } from '../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UIRoastingMachineStorage } from '../../services/uiRoastingMachineStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIWaterStorage } from '../../services/uiWaterStorage';
import { MillModalSelectComponent } from '../mill/mill-modal-select/mill-modal-select.component';
import { PreparationModalSelectComponent } from '../preparation/preparation-modal-select/preparation-modal-select.component';
import { RoastingMachineModalSelectComponent } from '../roasting-section/roasting-machine/roasting-machine-modal-select/roasting-machine-modal-select.component';
import { WaterModalSelectComponent } from '../water-section/water/water-modal-select/water-modal-select.component';

interface Chooser {
  radioSelection: string;
  multipleSelection: Record<string, boolean>;
  ngOnInit(): void;
}

const entries = ['a', 'b'].map((uuid) => ({
  name: uuid,
  finished: false,
  config: { uuid },
}));
const storage = { getAllEntries: () => entries };

const choosers: [string, Type<Chooser>][] = [
  ['grinder', MillModalSelectComponent],
  ['preparation method', PreparationModalSelectComponent],
  ['roasting machine', RoastingMachineModalSelectComponent],
  ['water', WaterModalSelectComponent],
];

for (const [name, component] of choosers) {
  describe(`The ${name} chooser`, () => {
    function create(inputs: object): Chooser {
      TestBed.configureTestingModule({
        providers: [
          { provide: ModalController, useValue: {} },
          { provide: UIMillStorage, useValue: storage },
          { provide: UIPreparationStorage, useValue: storage },
          { provide: UIRoastingMachineStorage, useValue: storage },
          { provide: UIWaterStorage, useValue: storage },
          { provide: UIMillHelper, useValue: {} },
          { provide: UIPreparationHelper, useValue: {} },
          {
            provide: UISettingsStorage,
            useValue: { getSettings: () => new Settings() },
          },
          {
            provide: PreparationSortFilterHelperService,
            useValue: { initializePreparationsView: () => entries },
          },
        ],
      });
      const chooser = TestBed.runInInjectionContext(() => new component());
      // Ionic sets the inputs before Angular initializes the component.
      Object.assign(chooser, inputs);
      chooser.ngOnInit();
      return chooser;
    }

    it('shows the chosen entry before the modal has entered', () => {
      const chooser = create({ multiple: false, selectedValues: ['b'] });

      expect(chooser.radioSelection).toBe('b');
    });

    it('ticks the chosen entries before the modal has entered', () => {
      const chooser = create({ multiple: true, selectedValues: ['b'] });

      expect(chooser.multipleSelection).toEqual({ a: false, b: true });
    });
  });
}
