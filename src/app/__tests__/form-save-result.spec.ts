import { Bean } from '../../classes/bean/bean';
import { GreenBean } from '../../classes/green-bean/green-bean';
import { Mill } from '../../classes/mill/mill';
import { Preparation } from '../../classes/preparation/preparation';
import { RoastingMachine } from '../../classes/roasting-machine/roasting-machine';
import { StorageClass } from '../../classes/storageClass';
import { storedOrReported } from '../../classes/storedOrReported';
import { Water } from '../../classes/water/water';
import type { UIAlert } from '../../services/uiAlert';
import { BeansAddComponent } from '../beans/beans-add/beans-add.component';
import { BeansEditComponent } from '../beans/beans-edit/beans-edit.component';
import { MillAddComponent } from '../mill/mill-add/mill-add.component';
import { MillEditComponent } from '../mill/mill-edit/mill-edit.component';
import { PreparationAddTypeComponent } from '../preparation/preparation-add-type/preparation-add-type.component';
import { PreparationEditComponent } from '../preparation/preparation-edit/preparation-edit.component';
import { GreenBeanAddComponent } from '../roasting-section/green-beans/green-bean-add/green-bean-add.component';
import { GreenBeanEditComponent } from '../roasting-section/green-beans/green-bean-edit/green-bean-edit.component';
import { RoastingMachineAddComponent } from '../roasting-section/roasting-machine/roasting-machine-add/roasting-machine-add.component';
import { RoastingMachineEditComponent } from '../roasting-section/roasting-machine/roasting-machine-edit/roasting-machine-edit.component';
import { WaterAddTypeComponent } from '../water-section/water/water-add-type/water-add-type.component';
import { WaterEditComponent } from '../water-section/water/water-edit/water-edit.component';

describe('storedOrReported', () => {
  let uiAlert: jasmine.SpyObj<Pick<UIAlert, 'showMessage'>>;

  beforeEach(() => {
    uiAlert = jasmine.createSpyObj('UIAlert', ['showMessage']);
    uiAlert.showMessage.and.resolveTo();
  });

  for (const stored of [true, { entry: {}, saved: true }]) {
    it(`resolves true without a message for ${JSON.stringify(stored)}`, async () => {
      expect(
        await storedOrReported(uiAlert, () => Promise.resolve(stored)),
      ).toBeTrue();
      expect(uiAlert.showMessage).not.toHaveBeenCalled();
    });
  }

  for (const unsaved of [false, { entry: {}, saved: false }]) {
    it(`shows its message for ${JSON.stringify(unsaved)} when the collection stayed silent`, async () => {
      expect(
        await storedOrReported(uiAlert, () => Promise.resolve(unsaved)),
      ).toBeFalse();
      expect(uiAlert.showMessage).toHaveBeenCalledOnceWith(
        'ERROR_OCCURED',
        'CARE',
        undefined,
        true,
      );
    });
  }

  it('shows no second message when the collection reported the failure', async () => {
    let shown = 0;
    spyOn(StorageClass, 'getMessagesShown').and.callFake(() => shown);

    const saved = await storedOrReported(uiAlert, () => {
      shown++;
      return Promise.resolve(false);
    });

    expect(saved).toBeFalse();
    expect(uiAlert.showMessage).not.toHaveBeenCalled();
  });
});

/**
 * A form tells of success and closes only when its entry was stored.
 * Otherwise it stays open and the user gets one message.
 */
describe('Saving a form', () => {
  interface Form {
    name: string;
    component: { prototype: object };
    storage: string;
    data: () => { name: string };
    /** What the form needs besides its entry and the services of all forms. */
    extra?: () => object;
    /** The method behind the save button, and what the template hands it. */
    save: string;
    saveArguments?: unknown[];
    toast: string;
  }

  const beanForm = () => ({
    bean: new Bean(),
    settings: { security_check_when_going_back: false },
    uiBeanHelper: jasmine.createSpyObj('UIBeanHelper', [
      'generateFrozenId',
      'logUsedBeanParameters',
    ]),
  });

  const forms: Form[] = [
    {
      name: 'bean edit',
      component: BeansEditComponent,
      storage: 'uiBeanStorage',
      data: () => new Bean(),
      extra: beanForm,
      save: 'editBean',
      toast: 'TOAST_BEAN_EDITED_SUCCESSFULLY',
    },
    {
      name: 'green bean edit',
      component: GreenBeanEditComponent,
      storage: 'uiGreenBeanStorage',
      data: () => new GreenBean(),
      save: 'editBean',
      toast: 'TOAST_GREEN_BEAN_EDITED_SUCCESSFULLY',
    },
    {
      name: 'mill edit',
      component: MillEditComponent,
      storage: 'uiMillStorage',
      data: () => new Mill(),
      save: 'editMill',
      saveArguments: [{ valid: true }],
      toast: 'TOAST_MILL_EDITED_SUCCESSFULLY',
    },
    {
      name: 'preparation edit',
      component: PreparationEditComponent,
      storage: 'uiPreparationStorage',
      data: () => new Preparation(),
      extra: () => ({ nextToolName: '' }),
      save: 'edit',
      saveArguments: [{ valid: true }],
      toast: 'TOAST_PREPARATION_EDITED_SUCCESSFULLY',
    },
    {
      name: 'water edit',
      component: WaterEditComponent,
      storage: 'uiWaterStorage',
      data: () => new Water(),
      save: 'edit',
      toast: 'TOAST_WATER_EDITED_SUCCESSFULLY',
    },
    {
      name: 'roasting machine edit',
      component: RoastingMachineEditComponent,
      storage: 'uiRoastingMachineStorage',
      data: () => new RoastingMachine(),
      save: 'edit',
      saveArguments: [{ valid: true }],
      toast: 'TOAST_ROASTING_MACHINE_EDITED_SUCCESSFULLY',
    },
    {
      name: 'bean add',
      component: BeansAddComponent,
      storage: 'uiBeanStorage',
      data: () => new Bean(),
      extra: beanForm,
      save: 'addBean',
      toast: 'TOAST_BEAN_ADDED_SUCCESSFULLY',
    },
    {
      name: 'green bean add',
      component: GreenBeanAddComponent,
      storage: 'uiGreenBeanStorage',
      data: () => new GreenBean(),
      save: 'addBean',
      toast: 'TOAST_GREEN_BEAN_ADDED_SUCCESSFULLY',
    },
    {
      name: 'mill add',
      component: MillAddComponent,
      storage: 'uiMillStorage',
      data: () => new Mill(),
      save: 'addMill',
      toast: 'TOAST_MILL_ADDED_SUCCESSFULLY',
    },
    {
      name: 'preparation add',
      component: PreparationAddTypeComponent,
      storage: 'uiPreparationStorage',
      data: () => new Preparation(),
      extra: () => ({
        preparationForm: { valid: true },
        uiPreparationHelper: jasmine.createSpyObj('UIPreparationHelper', [
          'connectDevice',
        ]),
      }),
      save: 'addPreparation',
      toast: 'TOAST_PREPARATION_ADDED_SUCCESSFULLY',
    },
    {
      name: 'water add',
      component: WaterAddTypeComponent,
      storage: 'uiWaterStorage',
      data: () => new Water(),
      save: 'add',
      toast: 'TOAST_WATER_ADDED_SUCCESSFULLY',
    },
    {
      name: 'roasting machine add',
      component: RoastingMachineAddComponent,
      storage: 'uiRoastingMachineStorage',
      data: () => new RoastingMachine(),
      save: 'add',
      toast: 'TOAST_ROASTING_MACHINE_ADDED_SUCCESSFULLY',
    },
  ];

  for (const form of forms) {
    describe('of a ' + form.name, () => {
      let saved: boolean;
      /** Messages the collection shows for the write. */
      let reported: number;
      let shown: number;
      let uiToast: jasmine.SpyObj<{ showInfoToast: (_text: string) => void }>;
      let uiAlert: jasmine.SpyObj<Pick<UIAlert, 'showMessage'>>;
      let uiImage: jasmine.SpyObj<{ deleteRemovedPhotos: () => Promise<void> }>;
      let modalController: jasmine.SpyObj<{ dismiss: () => void }>;
      let component: { data: { name: string } } & Record<
        string,
        (..._arguments: unknown[]) => Promise<void>
      >;

      const save = () => component[form.save](...(form.saveArguments ?? []));

      beforeEach(() => {
        saved = true;
        reported = 0;
        shown = 0;
        spyOn(StorageClass, 'getMessagesShown').and.callFake(() => shown);
        const data = form.data();
        data.name = 'Entry';
        const write = () => {
          shown += reported;
          return saved;
        };
        uiToast = jasmine.createSpyObj('UIToast', ['showInfoToast']);
        uiAlert = jasmine.createSpyObj('UIAlert', ['showMessage']);
        uiAlert.showMessage.and.resolveTo();
        uiImage = jasmine.createSpyObj('UIImage', ['deleteRemovedPhotos']);
        modalController = jasmine.createSpyObj('ModalController', ['dismiss']);
        component = Object.assign(Object.create(form.component.prototype), {
          data,
          [form.storage]: {
            update: () => Promise.resolve(write()),
            addAndConfirm: (_entry: object) =>
              Promise.resolve({ entry: _entry, saved: write() }),
            getAllEntries: () => [],
          },
          uiImage,
          uiToast,
          uiAlert,
          uiAnalytics: jasmine.createSpyObj('UIAnalytics', [
            'trackEvent',
            'trackContentImpression',
            'trackBulkEvents',
            'trackBulkContentImpressions',
          ]),
          modalController,
          ...form.extra?.(),
        });
      });

      it('tells of success and closes when the entry was stored', async () => {
        await save();

        expect(uiToast.showInfoToast).toHaveBeenCalledOnceWith(form.toast);
        expect(modalController.dismiss).toHaveBeenCalledTimes(1);
        expect(uiAlert.showMessage).not.toHaveBeenCalled();
      });

      it('stays open with one message when the collection silently stored nothing', async () => {
        saved = false;

        await save();

        expect(uiToast.showInfoToast).not.toHaveBeenCalled();
        expect(modalController.dismiss).not.toHaveBeenCalled();
        expect(uiImage.deleteRemovedPhotos).not.toHaveBeenCalled();
        expect(component.data.name).toBe('Entry');
        expect(uiAlert.showMessage).toHaveBeenCalledOnceWith(
          'ERROR_OCCURED',
          'CARE',
          undefined,
          true,
        );
      });

      it('stays open without a second message when the collection reported the failed save', async () => {
        saved = false;
        reported = 1;

        await save();

        expect(uiToast.showInfoToast).not.toHaveBeenCalled();
        expect(modalController.dismiss).not.toHaveBeenCalled();
        expect(uiAlert.showMessage).not.toHaveBeenCalled();
      });
    });
  }
});
