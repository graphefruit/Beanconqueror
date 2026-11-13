import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';

import { BrewAddComponent } from '../../app/brew/brew-add/brew-add.component';
import { BrewChoosePreparationToBrewComponent } from '../../app/brew/brew-choose-preparation-to-brew/brew-choose-preparation-to-brew.component';
import { Bean } from '../../classes/bean/bean';
import { Brew } from '../../classes/brew/brew';
import { BrewFlow } from '../../classes/brew/brewFlow';
import { Preparation } from '../../classes/preparation/preparation';
import { Settings } from '../../classes/settings/settings';
import { CoffeeBluetoothDevicesService } from '../coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { UIAlert } from '../uiAlert';
import { UIAnalytics } from '../uiAnalytics';
import { UIBeanHelper } from '../uiBeanHelper';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewHelper } from '../uiBrewHelper';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIHelper } from '../uiHelper';
import { UIMillStorage } from '../uiMillStorage';
import { UIPreparationStorage } from '../uiPreparationStorage';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIToast } from '../uiToast';

interface IModalOptions {
  component: unknown;
  componentProps?: Record<string, unknown>;
}

/**
 * Stands in for an ion-modal. Like the real one, onWillDismiss() only hears a
 * dismiss that happens after it was called.
 */
class FakeModal {
  public presented = false;
  public dismissed = false;
  public backdropDismiss = false;
  private willDismissListeners: ((detail: { data?: unknown }) => void)[] = [];

  constructor(public readonly options: IModalOptions) {}

  public present(): Promise<void> {
    this.presented = true;
    return Promise.resolve();
  }

  public onWillDismiss(): Promise<{ data?: unknown }> {
    return new Promise((resolve) => this.willDismissListeners.push(resolve));
  }

  /** What saving, cancelling, the back gesture or the backdrop do. */
  public dismiss(data?: unknown): void {
    this.presented = false;
    this.dismissed = true;
    const listeners = this.willDismissListeners;
    this.willDismissListeners = [];
    listeners.forEach((resolve) => resolve({ data }));
  }
}

class FakeModalController {
  public readonly modals: FakeModal[] = [];
  public readonly dismiss = jasmine.createSpy('dismiss');
  /** Lets a test change the next modal before the brew helper presents it. */
  public prepareNextModal: (modal: FakeModal) => void;

  public create(options: IModalOptions): Promise<FakeModal> {
    const modal = new FakeModal(options);
    if (this.prepareNextModal) {
      this.prepareNextModal(modal);
      this.prepareNextModal = undefined;
    }
    this.modals.push(modal);
    return Promise.resolve(modal);
  }

  public brewForms(): FakeModal[] {
    return this.modals.filter(
      (modal) => modal.options.component === BrewAddComponent,
    );
  }

  public preparationChoosers(): FakeModal[] {
    return this.modals.filter(
      (modal) =>
        modal.options.component === BrewChoosePreparationToBrewComponent,
    );
  }
}

/** Lets every pending step of the brew helper run. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

describe('UIBrewHelper opening the brew form', () => {
  let helper: UIBrewHelper;
  let modalController: FakeModalController;
  let showInfoToast: jasmine.Spy;

  const bean = {
    config: { uuid: 'bean-1' },
    finished: false,
    internal_share_code: 'BEAN01',
  } as unknown as Bean;
  const preparation = {
    config: { uuid: 'preparation-1' },
    finished: false,
  } as unknown as Preparation;
  const lastBrew = {
    config: { uuid: 'brew-1', unix_timestamp: 1700000000 },
    getBean: () => ({ finished: false }),
    getMill: () => ({ finished: false }),
    getPreparation: () => ({ finished: false }),
  } as unknown as Brew;
  const brewFlow = {} as BrewFlow;

  beforeEach(() => {
    const noEvents = { subscribe: () => ({ unsubscribe: () => undefined }) };
    const storage = (entries: unknown[]) => ({
      attachOnEvent: () => noEvents,
      getAllEntries: () => entries,
    });
    modalController = new FakeModalController();
    showInfoToast = jasmine.createSpy('showInfoToast');
    spyOn(UIBeanHelper, 'getInstance').and.returnValue({
      getAllBrewsForThisBean: () => [lastBrew],
    } as unknown as UIBeanHelper);

    TestBed.configureTestingModule({
      providers: [
        UIBrewHelper,
        { provide: ModalController, useValue: modalController },
        { provide: UIToast, useValue: { showInfoToast } },
        { provide: UIBeanStorage, useValue: storage([bean]) },
        { provide: UIMillStorage, useValue: storage([{ finished: false }]) },
        { provide: UIPreparationStorage, useValue: storage([preparation]) },
        { provide: UIBrewStorage, useValue: storage([lastBrew]) },
        {
          provide: UISettingsStorage,
          useValue: {
            attachOnEvent: () => noEvents,
            getSettings: () => new Settings(),
          },
        },
        {
          provide: UIAlert,
          useValue: jasmine.createSpyObj('UIAlert', ['presentCustomPopover']),
        },
        {
          provide: UIAnalytics,
          useValue: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
        },
        { provide: TranslateService, useValue: {} },
        { provide: UIHelper, useValue: {} },
        { provide: CoffeeBluetoothDevicesService, useValue: {} },
      ],
    });
    helper = TestBed.inject(UIBrewHelper);
  });

  it('opens the brew form with the preset of each entry point', async () => {
    const entryPoints = [
      () => helper.addBrew(),
      () => helper.addBrewWithPresetBean(bean),
      () => helper.addBrewFromVisualizerWithGraph(brewFlow),
      () => helper.repeatBrew(lastBrew),
      () => helper.startBrewForBeanByInternalShareCode('BEAN01'),
      () => helper.repeatLastBrewForBeanByInternalShareCode('BEAN01'),
    ];
    for (const open of entryPoints) {
      void open();
      await settle();
      modalController.brewForms().at(-1).dismiss();
      await settle();
    }

    expect(
      modalController.brewForms().map((form) => form.options.componentProps),
    ).toEqual([
      undefined,
      { bean_preset: bean },
      { brew_flow_preset: brewFlow },
      { brew_template: lastBrew },
      { bean_preset: bean },
      { brew_template: lastBrew },
    ]);
  });

  it('keeps the open brew form when a quick action, NFC tag or link asks for another one', async () => {
    void helper.addBrew();
    await settle();

    void helper.addBrew();
    void helper.addBrewWithPresetBean(bean);
    void helper.addBrewFromVisualizerWithGraph(brewFlow);
    void helper.repeatBrew(lastBrew);
    void helper.startBrewForBeanByInternalShareCode('BEAN01');
    void helper.repeatLastBrewForBeanByInternalShareCode('BEAN01');
    await settle();

    expect(modalController.brewForms().length).toBe(1);
    expect(modalController.brewForms()[0].dismissed).toBeFalse();
    expect(modalController.dismiss).not.toHaveBeenCalled();
  });

  it('tells the user that a brew form is already open', async () => {
    void helper.addBrew();
    await settle();

    void helper.startBrewForBeanByInternalShareCode('BEAN01');
    await settle();

    expect(showInfoToast).toHaveBeenCalledOnceWith('TOAST_BREW_ALREADY_OPEN');
  });

  it('opens one brew form when two entry points are used at the same time', async () => {
    void helper.addBrew();
    void helper.addBrewWithPresetBean(bean);
    await settle();

    expect(modalController.brewForms().length).toBe(1);
  });

  it('does not offer the preparation chooser while a brew form is open', async () => {
    void helper.addBrew();
    await settle();

    void helper.longPressAddBrew();
    void helper.startBrewAndChoosePreparationMethodForBeanByInternalShareCode(
      'BEAN01',
    );
    await settle();

    expect(modalController.preparationChoosers().length).toBe(0);
    expect(modalController.brewForms().length).toBe(1);
  });

  it('opens the brew form with the preparation picked in the chooser', async () => {
    void helper.startBrewAndChoosePreparationMethodForBeanByInternalShareCode(
      'BEAN01',
    );
    await settle();
    modalController
      .preparationChoosers()[0]
      .dismiss({ dismissed: true, preparation });
    await settle();

    expect(modalController.brewForms().length).toBe(1);
    expect(modalController.brewForms()[0].options.componentProps).toEqual({
      loadSpecificLastPreparation: preparation,
      bean_preset: bean,
    });
  });

  it('does not open a second brew form from the chooser when one was opened meanwhile', async () => {
    void helper.longPressAddBrew();
    await settle();
    void helper.addBrew();
    await settle();

    modalController
      .preparationChoosers()[0]
      .dismiss({ dismissed: true, preparation });
    await settle();

    expect(modalController.brewForms().length).toBe(1);
    expect(modalController.brewForms()[0].dismissed).toBeFalse();
  });

  it('opens a brew form again after the previous one was closed', async () => {
    void helper.addBrew();
    await settle();
    modalController.brewForms()[0].dismiss({ dismissed: true });
    await settle();
    void helper.repeatBrew(lastBrew);
    await settle();
    modalController.brewForms()[1].dismiss();
    await settle();

    void helper.addBrew();
    await settle();

    expect(modalController.brewForms().length).toBe(3);
    expect(showInfoToast).not.toHaveBeenCalled();
  });

  it('opens a brew form again after one was closed while it was still opening', async () => {
    modalController.prepareNextModal = (modal) => {
      modal.present = () => {
        modal.presented = true;
        modal.dismiss();
        return Promise.resolve();
      };
    };
    let firstFinished = false;
    void helper.addBrew().then(() => (firstFinished = true));
    await settle();

    void helper.addBrew();
    await settle();

    expect(firstFinished).toBeTrue();
    expect(modalController.brewForms().length).toBe(2);
  });

  it('opens a brew form again after creating the previous one failed', async () => {
    const create = spyOn(modalController, 'create').and.rejectWith(
      new Error('create failed'),
    );
    await expectAsync(helper.addBrew()).toBeRejectedWithError('create failed');
    create.and.callThrough();

    void helper.addBrew();
    await settle();

    expect(modalController.brewForms().length).toBe(1);
  });

  it('opens a brew form again after presenting the previous one failed', async () => {
    modalController.prepareNextModal = (modal) => {
      modal.present = () => Promise.reject(new Error('present failed'));
    };
    await expectAsync(helper.addBrew()).toBeRejectedWithError('present failed');

    void helper.addBrew();
    await settle();

    expect(modalController.brewForms().length).toBe(2);
    expect(modalController.brewForms()[1].presented).toBeTrue();
  });
});
