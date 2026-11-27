import { Bean } from '../../classes/bean/bean';
import { Graph } from '../../classes/graph/graph';
import { Preparation } from '../../classes/preparation/preparation';
import { StorageClass } from '../../classes/storageClass';
import { BrewBrewingPreparationDeviceComponent } from '../../components/brews/brew-brewing-preparation-device/brew-brewing-preparation-device.component';
import { PreparationInformationCardComponent } from '../../components/preparation-information-card/preparation-information-card.component';
import { UIPreparationHelper } from '../../services/uiPreparationHelper';
import { BaristaPage } from '../baristamode/barista/barista.page';
import { BeanPopoverUnfreezeComponent } from '../beans/bean-popover-unfreeze/bean-popover-unfreeze.component';
import { GraphAddComponent } from '../graph-section/graph/graph-add/graph-add.component';

type Methods = Record<string, (..._arguments: unknown[]) => Promise<unknown>>;

/**
 * What follows adding an entry happens only when the entry was stored: an
 * entry that could not be saved is not in the collection.
 */
describe('Adding an entry outside the forms', () => {
  let saved: boolean;
  let storage: {
    addAndConfirm: jasmine.Spy;
    applyChanges: jasmine.Spy;
    update: jasmine.Spy;
    getAllEntries: () => unknown[];
  };
  let uiAlert: Record<string, jasmine.Spy>;
  let uiToast: jasmine.SpyObj<{ showInfoToast: (_text: string) => void }>;
  let modalController: jasmine.SpyObj<{ dismiss: () => void }>;
  let uiFileHelper: Record<string, jasmine.Spy>;

  const create = (component: { prototype: object }, parts: object): Methods =>
    Object.assign(Object.create(component.prototype) as Methods, parts);

  beforeEach(() => {
    saved = false;
    storage = {
      addAndConfirm: jasmine
        .createSpy('addAndConfirm')
        .and.callFake((_entry: { config: { uuid: string } }) => {
          const entry = StorageClass.cloneData(_entry);
          entry.config.uuid = 'added';
          return Promise.resolve({ entry, saved });
        }),
      applyChanges: jasmine
        .createSpy('applyChanges')
        .and.callFake(() => Promise.resolve({ saved, added: [] })),
      update: jasmine.createSpy('update').and.resolveTo(true),
      getAllEntries: () => [],
    };
    uiAlert = jasmine.createSpyObj('UIAlert', [
      'showMessage',
      'showConfirm',
      'showLoadingSpinner',
      'hideLoadingSpinner',
    ]);
    uiAlert.showMessage.and.resolveTo();
    uiAlert.showConfirm.and.resolveTo('YES');
    uiToast = jasmine.createSpyObj('UIToast', ['showInfoToast']);
    modalController = jasmine.createSpyObj('ModalController', ['dismiss']);
    uiFileHelper = jasmine.createSpyObj('UIFileHelper', [
      'readInternalFileAsBase64',
      'generateInternalPath',
      'writeInternalFileFromBase64',
      'writeInternalFileFromText',
      'deleteInternalFile',
    ]);
    uiFileHelper.readInternalFileAsBase64.and.resolveTo('no-image');
    uiFileHelper.generateInternalPath.and.resolveTo('photo-copy.jpg');
    uiFileHelper.writeInternalFileFromBase64.and.resolveTo({
      path: 'photo-copy.jpg',
    });
    uiFileHelper.writeInternalFileFromText.and.resolveTo();
    uiFileHelper.deleteInternalFile.and.resolveTo();
  });

  describe('unfreezing a part of a bean', () => {
    let bean: Bean;
    let settingsStorage: Record<string, jasmine.Spy>;

    const unfreeze = () => {
      bean = new Bean();
      bean.weight = 200;
      bean.cost = 20;
      bean.frozenGroupId = 'group';
      bean.attachments = ['photo.jpg'];
      settingsStorage = jasmine.createSpyObj('UISettingsStorage', [
        'saveSettings',
        'getSettings',
      ]);
      settingsStorage.getSettings.and.returnValue({
        resetBeanFilter: () => undefined,
      });
      return create(BeanPopoverUnfreezeComponent, {
        bean,
        unfreezeWeight: 50,
        maxWeight: 200,
        copyAttachments: true,
        quality: 100,
        maxMB: 0.5,
        uiBeanStorage: storage,
        uiBeanHelper: { generateFrozenId: () => 'F1' },
        uiHelper: {
          cloneData: (_value: unknown) => StorageClass.cloneData(_value),
          toFixedIfNecessary: (_value: number) => _value,
        },
        uiFileHelper,
        uiAlert,
        uiToast,
        uiSettingsStorage: settingsStorage,
        uiAnalytics: { trackEvent: () => undefined },
        modalController,
      }).save();
    };

    it('takes the part off the frozen bean when it was stored', async () => {
      saved = true;

      await unfreeze();

      // The part and the rest of the bean are stored together.
      const [changes] = storage.applyChanges.calls.mostRecent().args as [
        { update: Bean[]; add: Bean[] },
      ];
      expect(changes.add.map((_part) => _part.weight)).toEqual([50]);
      expect(changes.update.map((_rest) => _rest.weight)).toEqual([150]);
      expect(bean.weight).toBe(150);
      expect(bean.cost).toBe(15);
      expect(storage.addAndConfirm).not.toHaveBeenCalled();
      expect(storage.update).not.toHaveBeenCalled();
      expect(uiFileHelper.deleteInternalFile).not.toHaveBeenCalled();
      expect(uiToast.showInfoToast).toHaveBeenCalledTimes(1);
      expect(modalController.dismiss).toHaveBeenCalledTimes(1);
    });

    it('leaves the frozen bean as it is and stays open when the part was not stored', async () => {
      await unfreeze();

      expect(bean.weight).toBe(200);
      expect(bean.cost).toBe(20);
      expect(storage.update).not.toHaveBeenCalled();
      expect(uiFileHelper.deleteInternalFile).toHaveBeenCalledOnceWith(
        'photo-copy.jpg',
      );
      expect(uiAlert.hideLoadingSpinner).toHaveBeenCalledTimes(1);
      expect(uiAlert.showMessage).toHaveBeenCalledTimes(1);
      expect(uiToast.showInfoToast).not.toHaveBeenCalled();
      expect(modalController.dismiss).not.toHaveBeenCalled();
    });
  });

  describe('adding a graph', () => {
    let uiGraphHelper: jasmine.SpyObj<{ saveGraph: () => Promise<string> }>;

    const add = () => {
      uiGraphHelper = jasmine.createSpyObj('UIGraphHelper', ['saveGraph']);
      uiGraphHelper.saveGraph.and.resolveTo('graphs/added.json');
      return create(GraphAddComponent, {
        data: new Graph(),
        flowData: {},
        uiGraphStorage: storage,
        uiGraphHelper,
        uiAlert,
        uiToast,
        uiAnalytics: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
        modalController,
      }).__addGraph();
    };

    it('writes its file and closes when it was stored', async () => {
      saved = true;

      await add();

      expect(uiGraphHelper.saveGraph).toHaveBeenCalledTimes(1);
      expect(storage.update.calls.mostRecent().args[0].flow_profile).toBe(
        'graphs/added.json',
      );
      expect(uiToast.showInfoToast).toHaveBeenCalledTimes(1);
      expect(modalController.dismiss).toHaveBeenCalledTimes(1);
    });

    it('writes no file and stays open with one message when it was not stored', async () => {
      await add();

      expect(uiGraphHelper.saveGraph).not.toHaveBeenCalled();
      expect(storage.update).not.toHaveBeenCalled();
      expect(uiAlert.showMessage).toHaveBeenCalledTimes(1);
      expect(uiToast.showInfoToast).not.toHaveBeenCalled();
      expect(modalController.dismiss).not.toHaveBeenCalled();
    });
  });

  describe('a shot of the barista mode', () => {
    const save = () =>
      create(BaristaPage, {
        uiBaristamodeBrewStorage: storage,
        uiFileHelper,
        uiLog: jasmine.createSpyObj('UILog', ['log']),
        settings: { visualizer_active: false },
      }).saveBaristamodeBrew({
        shotWeight: 36,
        brew: { brew_time: 25 },
        flowProfile: { weight: [1], pressureFlow: [], temperatureFlow: [] },
        shotData: { counterVol: 40 },
        desiredWeight: 36,
        usedProfile: 'P1',
      });

    it('gets its flow profile when it was stored', async () => {
      saved = true;

      await save();

      expect(uiFileHelper.writeInternalFileFromText).toHaveBeenCalledTimes(1);
      expect(storage.update).toHaveBeenCalledTimes(1);
    });

    it('gets no flow profile file when it was not stored', async () => {
      await save();

      expect(uiFileHelper.writeInternalFileFromText).not.toHaveBeenCalled();
      expect(storage.update).not.toHaveBeenCalled();
    });
  });

  describe('a bean named by an imported shot', () => {
    let brew: { bean: string };

    const importShot = () => {
      brew = { bean: 'chosen-before' };
      return create(BrewBrewingPreparationDeviceComponent, {
        preparation: {
          connectedPreparationDevice: {
            customParams: { confirmBeanAdd: true },
          },
        },
        brewComponent: {
          data: brew,
          brewBrewingGraphEl: { showShot: () => undefined },
        },
        data: { preparationDeviceBrew: { params: {} } },
        settings: { bluetooth_scale_first_drip_threshold: 1000 },
        uiBeanStorage: storage,
        uiAlert,
      }).generateShotFlowProfileFromGaggimateData({
        id: 1,
        brewFlow: { weight: [{ actual_weight: 36 }] },
        notes: { beanType: 'New bean' },
        rating: 0,
        duration: 30000,
      });
    };

    it('is chosen for the brew when it was stored', async () => {
      saved = true;

      await importShot();

      expect(storage.addAndConfirm.calls.mostRecent().args[0].name).toBe(
        'New bean',
      );
      expect(brew.bean).toBe('added');
    });

    it('is not chosen for the brew when it was not stored', async () => {
      await importShot();

      expect(brew.bean).toBe('chosen-before');
      expect(uiAlert.hideLoadingSpinner).toHaveBeenCalledTimes(1);
    });
  });

  describe('copying a preparation', () => {
    const copy = () => {
      const helper = create(UIPreparationHelper, {
        uiHelper: {
          cloneData: (_value: unknown) => StorageClass.cloneData(_value),
        },
        translate: { instant: (_key: string) => _key },
        uiPreparationStorage: storage,
      });
      const preparation = new Preparation();
      preparation.name = 'V60';
      return create(PreparationInformationCardComponent, {
        preparation,
        uiPreparationHelper: helper,
        uiAnalytics: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
        uiAlert,
        uiToast,
      }).repeatPreparation();
    };

    it('tells of success when the copy was stored', async () => {
      saved = true;

      await copy();

      expect(storage.addAndConfirm.calls.mostRecent().args[0].name).toBe(
        'COPY V60',
      );
      expect(uiToast.showInfoToast).toHaveBeenCalledTimes(1);
      expect(uiAlert.showMessage).not.toHaveBeenCalled();
    });

    it('shows one message and no success when the copy was not stored', async () => {
      await copy();

      expect(uiToast.showInfoToast).not.toHaveBeenCalled();
      expect(uiAlert.showMessage).toHaveBeenCalledTimes(1);
    });
  });
});
