import { BeansEditComponent } from '../../../app/beans/beans-edit/beans-edit.component';
import { MillEditComponent } from '../../../app/mill/mill-edit/mill-edit.component';
import { PreparationEditComponent } from '../../../app/preparation/preparation-edit/preparation-edit.component';
import { GreenBeanEditComponent } from '../../../app/roasting-section/green-beans/green-bean-edit/green-bean-edit.component';
import { RoastingMachineEditComponent } from '../../../app/roasting-section/roasting-machine/roasting-machine-edit/roasting-machine-edit.component';
import { WaterEditComponent } from '../../../app/water-section/water/water-edit/water-edit.component';
import { Bean } from '../../../classes/bean/bean';
import { GreenBean } from '../../../classes/green-bean/green-bean';
import { Mill } from '../../../classes/mill/mill';
import { Preparation } from '../../../classes/preparation/preparation';
import { RoastingMachine } from '../../../classes/roasting-machine/roasting-machine';
import { Water } from '../../../classes/water/water';

/**
 * The edit forms delete the files of the photos removed in them, and only
 * after the entry was stored without them. The brew form is covered next to
 * its graph file (brew-edit-flow-profile.spec.ts).
 */
describe('Photos removed in an edit form', () => {
  interface EditForm {
    name: string;
    component: { prototype: object };
    storage: string;
    data: () => { name: string };
    /** What the form needs besides its entry and the services of all forms. */
    extra?: () => object;
    /** The method behind the save button, and what the template hands it. */
    save: string;
    saveArguments?: unknown[];
  }

  const forms: EditForm[] = [
    {
      name: 'bean',
      component: BeansEditComponent,
      storage: 'uiBeanStorage',
      data: () => new Bean(),
      extra: () => ({
        bean: new Bean(),
      }),
      save: 'editBean',
    },
    {
      name: 'green bean',
      component: GreenBeanEditComponent,
      storage: 'uiGreenBeanStorage',
      data: () => new GreenBean(),
      save: 'editBean',
    },
    {
      name: 'mill',
      component: MillEditComponent,
      storage: 'uiMillStorage',
      data: () => new Mill(),
      save: 'editMill',
      saveArguments: [{ valid: true }],
    },
    {
      name: 'preparation',
      component: PreparationEditComponent,
      storage: 'uiPreparationStorage',
      data: () => new Preparation(),
      extra: () => ({ nextToolName: '' }),
      save: 'edit',
      saveArguments: [{ valid: true }],
    },
    {
      name: 'water',
      component: WaterEditComponent,
      storage: 'uiWaterStorage',
      data: () => new Water(),
      save: 'edit',
    },
    {
      name: 'roasting machine',
      component: RoastingMachineEditComponent,
      storage: 'uiRoastingMachineStorage',
      data: () => new RoastingMachine(),
      save: 'edit',
      saveArguments: [{ valid: true }],
    },
  ];

  for (const form of forms) {
    describe('of a ' + form.name, () => {
      let calls: string[];
      let storage: jasmine.SpyObj<any>;
      let uiImage: jasmine.SpyObj<any>;
      let component: { data: object } & Record<
        string,
        (..._arguments: unknown[]) => Promise<void>
      >;

      beforeEach(() => {
        calls = [];
        storage = jasmine.createSpyObj('Storage', ['update']);
        storage.update.and.callFake(() => {
          calls.push('store');
          return Promise.resolve(true);
        });
        uiImage = jasmine.createSpyObj('UIImage', ['deleteRemovedPhotos']);
        uiImage.deleteRemovedPhotos.and.callFake(() => {
          calls.push('delete removed photos');
          return Promise.resolve();
        });
        const data = form.data();
        data.name = 'Entry';
        component = Object.assign(Object.create(form.component.prototype), {
          data,
          [form.storage]: storage,
          uiImage,
          uiToast: jasmine.createSpyObj('UIToast', ['showInfoToast']),
          uiAlert: jasmine.createSpyObj('UIAlert', ['showMessage']),
          uiAnalytics: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
          modalController: jasmine.createSpyObj('ModalController', ['dismiss']),
          ...form.extra?.(),
        });
      });

      it('lose their files after the entry was stored', async () => {
        await component[form.save](...(form.saveArguments ?? []));

        expect(calls).toEqual(['store', 'delete removed photos']);
        expect(uiImage.deleteRemovedPhotos).toHaveBeenCalledOnceWith(
          component.data,
        );
      });

      it('keep their files when the entry could not be stored', async () => {
        storage.update.and.resolveTo(false);

        await component[form.save](...(form.saveArguments ?? []));

        expect(storage.update).toHaveBeenCalledTimes(1);
        expect(uiImage.deleteRemovedPhotos).not.toHaveBeenCalled();
      });
    });
  }
});
