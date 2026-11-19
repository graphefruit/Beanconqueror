import {
  HttpErrorResponse,
  HttpHeaders,
  HttpInterceptorFn,
  HttpResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import {
  ActionSheetController,
  ModalController,
  Platform,
} from '@ionic/angular';

import type { ShareOptions } from '@capacitor/share';
// The plugin object is a proxy that cannot be spied on; the web
// implementation behind it can.
import { ShareWeb } from '@capacitor/share/dist/esm/web';
import { of, throwError } from 'rxjs';

import { BeanArchivePopoverComponent } from '../../app/beans/bean-archive-popover/bean-archive-popover.component';
import { BeanInternalShareCodeGeneratorComponent } from '../../app/beans/bean-internal-share-code-generator/bean-internal-share-code-generator.component';
import { BeanPopoverFreezeComponent } from '../../app/beans/bean-popover-freeze/bean-popover-freeze.component';
import { BeanPopoverListComponent } from '../../app/beans/bean-popover-list/bean-popover-list.component';
import { BeanPopoverUnfreezeComponent } from '../../app/beans/bean-popover-unfreeze/bean-popover-unfreeze.component';
import { BeansAddComponent } from '../../app/beans/beans-add/beans-add.component';
import { BeansDetailComponent } from '../../app/beans/beans-detail/beans-detail.component';
import { BeansEditComponent } from '../../app/beans/beans-edit/beans-edit.component';
import { BrewCuppingComponent } from '../../app/brew/brew-cupping/brew-cupping.component';
import de from '../../assets/i18n/de.json';
import en from '../../assets/i18n/en.json';
import { Bean } from '../../classes/bean/bean';
import { GreenBean } from '../../classes/green-bean/green-bean';
import { Settings } from '../../classes/settings/settings';
import { StorageClass } from '../../classes/storageClass';
import { BEAN_ROASTING_TYPE_ENUM } from '../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../enums/beans/mix';
import { ROASTS_ENUM } from '../../enums/beans/roasts';
import { BeanProto } from '../../generated/src/classes/bean/bean';
import { ServerBean } from '../../models/bean/serverBean';
import { QrCodeScannerPopoverComponent } from '../../popover/qr-code-scanner-popover/qr-code-scanner-popover.component';
import { MemoryDatabase } from '../../test-utils/memory-database';
import { ShareService } from '../shareService/share-service.service';
import { UIAlert } from '../uiAlert';
import { UIAnalytics } from '../uiAnalytics';
import { UIBeanHelper } from '../uiBeanHelper';
import { UIBeanStorage } from '../uiBeanStorage';
import { UIBrewStorage } from '../uiBrewStorage';
import { UIFileHelper } from '../uiFileHelper';
import { UIHelper } from '../uiHelper';
import { UILog } from '../uiLog';
import { UISettingsStorage } from '../uiSettingsStorage';
import { UIToast } from '../uiToast';

const ERROR_MESSAGE = [
  'QR.SERVER.ERROR_OCCURED',
  'ERROR_OCCURED',
  undefined,
  true,
];

interface Opened {
  component: unknown;
  id: string;
  componentProps?: Record<string, unknown>;
  [option: string]: unknown;
}

describe('UIBeanHelper', () => {
  let database: MemoryDatabase;
  let helper: UIBeanHelper;
  let brews: UIBrewStorage;
  let beans: UIBeanStorage;
  let settings: Settings;
  let log: { error: jasmine.Spy; debug: jasmine.Spy };

  /** Dialogs and steps in the order they happened. */
  let steps: string[];
  let createModal: jasmine.Spy;
  let createActionSheet: jasmine.Spy;
  let sheetResult: { data?: { action: string } };
  let showMessage: jasmine.Spy;
  let showInfoToast: jasmine.Spy;
  let trackEvent: jasmine.Spy;
  let trackBulkEvents: jasmine.Spy;
  let downloadExternalFile: jasmine.Spy;
  /** What the servers of the pictures answer to HEAD, by URL. */
  let contentTypes: Map<string, string | Error>;
  let requests: string[];

  const pictureServer: HttpInterceptorFn = (_request) => {
    requests.push(`${_request.method} ${_request.url}`);
    const answer = contentTypes.get(_request.url);
    if (answer === undefined || answer instanceof Error) {
      return throwError(
        () => new HttpErrorResponse({ status: 404, url: _request.url }),
      );
    }
    return of(
      new HttpResponse({
        status: 200,
        headers: new HttpHeaders(answer ? { 'Content-Type': answer } : {}),
      }),
    );
  };

  function opened(): Opened[] {
    return createModal.calls.allArgs().map(([_options]) => _options as Opened);
  }

  function storedBean(_uuid: string, _changes: object = {}): unknown {
    return { ...new Bean(), config: { uuid: _uuid }, ..._changes };
  }

  function storedBrew(_uuid: string, _bean: string, _dose = 0, _ground = 0) {
    return {
      config: { uuid: _uuid },
      bean: _bean,
      bean_weight_in: _dose,
      grind_weight: _ground,
    };
  }

  async function seed(_beans: unknown[], _brews: unknown[] = []) {
    database.values.set('BEANS', _beans);
    database.values.set('BREWS', _brews);
    await beans.initializeStorage();
    await brews.initializeStorage();
  }

  beforeEach(() => {
    database = new MemoryDatabase();
    (
      StorageClass as unknown as { refusedWriteReported: boolean }
    ).refusedWriteReported = false;
    steps = [];
    requests = [];
    contentTypes = new Map();
    settings = new Settings();
    sheetResult = {};

    const step = (_name: string) => {
      steps.push(_name);
      return Promise.resolve();
    };
    createModal = jasmine
      .createSpy('createModal')
      .and.callFake((_options: Opened) => {
        steps.push(`create ${_options.id}`);
        return Promise.resolve({
          present: () => step(`present ${_options.id}`),
          onWillDismiss: () => step(`dismissed ${_options.id}`),
        });
      });
    createActionSheet = jasmine
      .createSpy('createActionSheet')
      .and.callFake(() =>
        Promise.resolve({
          present: () => step('present sheet'),
          onWillDismiss: () => Promise.resolve(sheetResult),
        }),
      );
    showMessage = jasmine
      .createSpy('showMessage')
      .and.callFake(() => step('message'));
    showInfoToast = jasmine.createSpy('showInfoToast');
    trackEvent = jasmine.createSpy('trackEvent');
    trackBulkEvents = jasmine.createSpy('trackBulkEvents');
    downloadExternalFile = jasmine
      .createSpy('downloadExternalFile')
      .and.callFake((_url: string, _name: string, _ending: string) =>
        Promise.resolve(`downloaded-${requests.length}${_ending}`),
      );
    const alert = {
      showLoadingSpinner: () => step('spinner'),
      hideLoadingSpinner: () => step('spinner hidden'),
      showMessage,
    };

    const providers = database.providers();
    (UIAlert.getInstance as jasmine.Spy).and.returnValue(alert);
    TestBed.configureTestingModule({
      providers: [
        ...providers,
        provideHttpClient(withInterceptors([pictureServer])),
        { provide: UIAlert, useValue: alert },
        { provide: ModalController, useValue: { create: createModal } },
        {
          provide: ActionSheetController,
          useValue: { create: createActionSheet },
        },
        { provide: UIToast, useValue: { showInfoToast } },
        { provide: UIAnalytics, useValue: { trackEvent, trackBulkEvents } },
        { provide: UIFileHelper, useValue: { downloadExternalFile } },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings },
        },
        { provide: Platform, useValue: { is: () => false } },
        {
          // Encoding and decoding are part of what is characterized here.
          provide: UIHelper,
          useValue: {
            encode: (_bytes: Uint8Array) => UIHelper.prototype.encode(_bytes),
            decode: (_text: string) => UIHelper.prototype.decode(_text),
          },
        },
      ],
    });
    log = TestBed.inject(UILog) as unknown as typeof log;
    brews = TestBed.inject(UIBrewStorage);
    beans = TestBed.inject(UIBeanStorage);
    helper = TestBed.inject(UIBeanHelper);
  });

  describe('finding what belongs to a bean', () => {
    it('returns the brews of the bean and none for an unknown one', async () => {
      await seed(
        [storedBean('a'), storedBean('b')],
        [
          storedBrew('1', 'a'),
          storedBrew('2', 'b'),
          storedBrew('3', 'a'),
          storedBrew('4', ''),
        ],
      );

      expect(
        helper.getAllBrewsForThisBean('a').map((_brew) => _brew.config.uuid),
      ).toEqual(['1', '3']);
      expect(helper.getAllBrewsForThisBean('unknown')).toEqual([]);
      expect(helper.getAllBrewsForThisBean(undefined)).toEqual([]);
    });

    it('finds nothing in a database without brews', async () => {
      await seed([storedBean('a')]);

      expect(helper.getAllBrewsForThisBean('a')).toEqual([]);
      expect(helper.getUsedWeightPerBean()).toEqual(new Map());
    });

    it('reads the brews once for several questions', async () => {
      await seed([storedBean('a')], [storedBrew('1', 'a')]);
      const read = spyOn(brews, 'getAllEntries').and.callThrough();

      helper.getAllBrewsForThisBean('a');
      helper.getAllBrewsForThisBean('b');
      helper.getUsedWeightPerBean();

      expect(read).toHaveBeenCalledTimes(1);
    });

    it('sees a brew that was stored after the first question', async () => {
      await seed([storedBean('a')], [storedBrew('1', 'a')]);
      expect(helper.getAllBrewsForThisBean('a').length).toBe(1);

      await brews.add(Object.assign(brews.getAllEntries()[0], { bean: 'a' }));

      expect(helper.getAllBrewsForThisBean('a').length).toBe(2);
    });

    it('no longer sees a brew that was deleted', async () => {
      await seed(
        [storedBean('a')],
        [storedBrew('1', 'a'), storedBrew('2', 'a')],
      );
      expect(helper.getAllBrewsForThisBean('a').length).toBe(2);

      await brews.removeByUUID('1');

      expect(
        helper.getAllBrewsForThisBean('a').map((_brew) => _brew.config.uuid),
      ).toEqual(['2']);
    });

    it('adds up the used weight per bean: the dose, or the ground weight without one', async () => {
      await seed(
        [storedBean('a'), storedBean('b')],
        [
          storedBrew('1', 'a', 18, 20),
          storedBrew('2', 'a', 0, 15.5),
          storedBrew('3', 'b', 0.1, 0),
          storedBrew('4', 'b', 0.2, 0),
          storedBrew('5', 'c', 0, 0),
        ],
      );

      const used = helper.getUsedWeightPerBean();

      expect([...used.keys()]).toEqual(['a', 'b', 'c']);
      expect(used.get('a')).toBe(33.5);
      expect(used.get('b')).toBeCloseTo(0.3, 10);
      expect(used.get('c')).toBe(0);
    });

    it('finds the roasted beans of a green bean and of a roasting machine', async () => {
      await seed([
        storedBean('1', {
          bean_roast_information: { bean_uuid: 'green', roaster_machine: 'm1' },
        }),
        storedBean('2', {
          bean_roast_information: { bean_uuid: 'other', roaster_machine: 'm1' },
        }),
        storedBean('3', {
          bean_roast_information: { bean_uuid: 'green', roaster_machine: 'm2' },
        }),
        storedBean('4'),
      ]);
      const uuids = (_beans: Bean[]) =>
        _beans.map((_bean) => _bean.config.uuid);

      expect(uuids(helper.getAllRoastedBeansForThisGreenBean('green'))).toEqual(
        ['1', '3'],
      );
      expect(uuids(helper.getAllRoastedBeansForRoastingMachine('m1'))).toEqual([
        '1',
        '2',
      ]);
      expect(helper.getAllRoastedBeansForThisGreenBean('none')).toEqual([]);
      expect(helper.getAllRoastedBeansForRoastingMachine('none')).toEqual([]);
    });

    it('known gap: every bean that was not roasted here counts as roasted from a green bean without uuid', async () => {
      await seed([storedBean('1'), storedBean('2')]);

      expect(helper.getAllRoastedBeansForThisGreenBean('').length).toBe(2);
      expect(helper.getAllRoastedBeansForRoastingMachine('').length).toBe(2);
    });

    it('sees a roasted bean that was stored after the first question', async () => {
      await seed([
        storedBean('1', { bean_roast_information: { bean_uuid: 'green' } }),
      ]);
      expect(helper.getAllRoastedBeansForThisGreenBean('green').length).toBe(1);
      const second = new Bean();
      second.bean_roast_information.bean_uuid = 'green';
      second.bean_roast_information.roaster_machine = 'm1';

      await beans.add(second);

      expect(helper.getAllRoastedBeansForThisGreenBean('green').length).toBe(2);
      expect(helper.getAllRoastedBeansForRoastingMachine('m1').length).toBe(1);
    });

    it('shows a field only for a plain true', () => {
      expect(helper.fieldVisible(true)).toBeTrue();
      expect(helper.fieldVisible(false)).toBeFalse();
      expect(helper.fieldVisible(undefined)).toBeFalse();
      expect(helper.fieldVisible('true' as unknown as boolean)).toBeFalse();
    });
  });

  describe('frozen ids', () => {
    it('takes six digits to the base of 20 from a random number', () => {
      spyOn(Math, 'random').and.returnValues(0.123456789, 0.999999999);

      expect(helper.generateFrozenId()).toBe('297d1e');
      expect(helper.generateFrozenId()).toBe('jjjjjj');
    });

    it('known gap: a short random number gives a short or an empty id', () => {
      spyOn(Math, 'random').and.returnValues(0.5, 0);

      expect(helper.generateFrozenId()).toBe('a');
      expect(helper.generateFrozenId()).toBe('');
    });
  });

  describe('opening a dialog', () => {
    const bean = Object.assign(new Bean(), { name: 'Alpha' });
    const greenBean = new GreenBean();
    const cases: [string, () => Promise<void>, Opened][] = [
      [
        'adding a bean',
        () => helper.addBean(),
        {
          component: BeansAddComponent,
          id: 'bean-add',
          componentProps: { hide_toast_message: false },
        },
      ],
      [
        'adding a bean without a toast',
        () => helper.addBean(true),
        {
          component: BeansAddComponent,
          id: 'bean-add',
          componentProps: { hide_toast_message: true },
        },
      ],
      [
        'freezing',
        () => helper.freezeBean(bean),
        {
          component: BeanPopoverFreezeComponent,
          id: 'bean-popover-freeze',
          componentProps: { bean },
        },
      ],
      [
        'unfreezing',
        () => helper.unfreezeBean(bean),
        {
          component: BeanPopoverUnfreezeComponent,
          id: 'bean-popover-unfreeze',
          componentProps: { bean },
        },
      ],
      [
        'the code of a bean',
        () => helper.generateQRCode(bean),
        {
          component: BeanInternalShareCodeGeneratorComponent,
          id: BeanInternalShareCodeGeneratorComponent.COMPONENT_ID,
          componentProps: { bean },
        },
      ],
      [
        'repeating a bean',
        () => helper.repeatBean(bean),
        {
          component: BeansAddComponent,
          id: 'bean-add',
          componentProps: { bean_template: bean },
        },
      ],
      [
        'roasting a green bean',
        () => helper.addRoastedBean(greenBean),
        {
          component: BeansAddComponent,
          id: 'bean-add',
          componentProps: { greenBean },
        },
      ],
      [
        'a list of beans',
        () => helper.showBeans([bean]),
        {
          component: BeanPopoverListComponent,
          id: BeanPopoverListComponent.COMPONENT_ID,
          componentProps: { beansList: [bean] },
        },
      ],
      [
        'editing',
        () => helper.editBean(bean),
        {
          component: BeansEditComponent,
          id: 'bean-edit',
          componentProps: { bean },
        },
      ],
      [
        'the details',
        () => helper.detailBean(bean),
        {
          component: BeansDetailComponent,
          id: 'bean-detail',
          componentProps: { bean },
        },
      ],
      [
        'cupping',
        () => helper.cupBean(bean),
        {
          component: BrewCuppingComponent,
          id: BrewCuppingComponent.COMPONENT_ID,
          componentProps: { bean },
        },
      ],
      [
        'archiving',
        () => helper.archiveBeanWithRatingQuestion(bean),
        {
          component: BeanArchivePopoverComponent,
          cssClass: 'popover-actions',
          id: BeanArchivePopoverComponent.COMPONENT_ID,
          breakpoints: [0, 0.75, 1],
          initialBreakpoint: 0.75,
          componentProps: { bean },
        },
      ],
    ];

    for (const [name, open, expected] of cases) {
      it(`for ${name} hands over the entry and waits until it is closed`, async () => {
        await open();

        expect(opened()).toEqual([expected]);
        expect(opened()[0].componentProps.bean).toBe(
          expected.componentProps.bean,
        );
        expect(steps).toEqual([
          `create ${expected.id}`,
          `present ${expected.id}`,
          `dismissed ${expected.id}`,
        ]);
      });
    }

    it('counts archiving and nothing else', async () => {
      await helper.archiveBeanWithRatingQuestion(bean);
      await helper.editBean(bean);

      expect(trackEvent.calls.allArgs()).toEqual([['BEAN', 'ARCHIVE']]);
    });
  });

  describe('a bean code', () => {
    beforeEach(async () => {
      await seed([
        storedBean('1', { name: 'No code' }),
        storedBean('2', { name: 'Alpha', internal_share_code: 'code-a' }),
        storedBean('3', { name: 'Twin', internal_share_code: 'code-a' }),
        storedBean('4', { name: 'Beta', internal_share_code: 'code-b' }),
      ]);
    });

    it('opens the details of the first bean with the code', async () => {
      await helper.detailBeanByInternalShareCode('code-a');

      expect(opened().length).toBe(1);
      expect(opened()[0].component).toBe(BeansDetailComponent);
      expect((opened()[0].componentProps.bean as Bean).name).toBe('Alpha');
    });

    it('opens the bean with the code for editing', async () => {
      await helper.editBeanByInternalShareCode('code-b');

      expect(opened().length).toBe(1);
      expect(opened()[0].component).toBe(BeansEditComponent);
      expect((opened()[0].componentProps.bean as Bean).name).toBe('Beta');
    });

    for (const code of ['unknown', 'CODE-A', 'code', undefined]) {
      it(`opens nothing for the code ${code}`, async () => {
        await helper.detailBeanByInternalShareCode(code);
        await helper.editBeanByInternalShareCode(code);

        expect(createModal).not.toHaveBeenCalled();
      });
    }

    it('known gap: an empty code opens the first bean that has no code', async () => {
      await helper.editBeanByInternalShareCode('');

      expect((opened()[0].componentProps.bean as Bean).name).toBe('No code');
    });

    it('offers five actions for a scanned code and returns the chosen one', async () => {
      sheetResult = { data: { action: 'REPEAT_LAST_BREW' } };

      const action = await helper.chooseNFCTagAction();

      expect(action).toBe('REPEAT_LAST_BREW');
      expect(createActionSheet.calls.argsFor(0)[0]).toEqual({
        header: 'BEAN_CODE_ON_ACTION_SCANNED_TITLE',
        buttons: [
          {
            text: 'BEAN_CODE_ACTION.START_BREW',
            data: { action: 'START_BREW' },
          },
          {
            text: 'BEAN_CODE_ACTION.START_BREW_CHOOSE_PREPARATION',
            data: { action: 'START_BREW_CHOOSE_PREPARATION' },
          },
          {
            text: 'BEAN_CODE_ACTION.REPEAT_LAST_BREW',
            data: { action: 'REPEAT_LAST_BREW' },
          },
          { text: 'BEAN_CODE_ACTION.EDIT', data: { action: 'EDIT' } },
          { text: 'BEAN_CODE_ACTION.DETAIL', data: { action: 'DETAIL' } },
        ],
      });
      expect(steps).toEqual(['present sheet']);
    });

    it('returns no action when the choice is closed', async () => {
      sheetResult = {};
      expect(await helper.chooseNFCTagAction()).toBeUndefined();

      sheetResult = undefined;
      expect(await helper.chooseNFCTagAction()).toBeUndefined();
    });
  });

  describe('a bean scanned from a roaster', () => {
    function serverBean(_changes: Partial<ServerBean> = {}): ServerBean {
      return Object.assign(new ServerBean(), {
        name: 'Roaster bean',
        roaster: 'Roastery',
        roast: 13,
        roast_custom: 'Extra dark',
        roast_range: 4,
        roastingDate: '2026-03-01T23:30:00.000Z',
        note: 'Note',
        aromatics: 'Cherry',
        weight: 250,
        cost: 12.5,
        cupping_points: 88,
        decaffeinated: true,
        url: 'https://roaster.example/bean',
        ean_article_number: '4006381333931',
        bean_roasting_type: 1,
        beanMix: 2,
        qr_code: 'QR-1',
        bean_information: [
          {
            country: 'Kenya',
            region: 'Nyeri',
            farm: 'Farm',
            farmer: 'Farmer',
            elevation: '1800',
            harvest_time: '2025',
            variety: 'SL28',
            processing: 'Washed',
            certification: 'Organic',
            percentage: 100,
            fob_price: 5,
            purchasing_price: 7,
          },
        ],
        attachment: [],
        error: null,
        ..._changes,
      });
    }

    it('opens the add dialog with the bean of the roaster', async () => {
      settings.qr_scanner_information = true;
      const scanned = serverBean();

      await helper.addScannedQRBean(scanned);

      expect(opened().length).toBe(1);
      expect(opened()[0].component).toBe(BeansAddComponent);
      expect(opened()[0].componentProps.server_bean).toBe(scanned);
      const bean = opened()[0].componentProps.bean_template as Bean;
      expect(bean).toEqual(jasmine.any(Bean));
      expect(bean.name).toBe('Roaster bean');
      expect(bean.roaster).toBe('Roastery');
      expect(bean.roast).toBe('CUSTOM_ROAST');
      expect(bean.roastingDate).toBe('2026-03-01T23:30:00.000Z');
      expect(bean.weight).toBe(250);
      expect(bean.cost).toBe(12.5);
      expect(bean.cupping_points).toBe('88');
      expect(bean.decaffeinated).toBeTrue();
      expect(bean.bean_roasting_type).toBe('ESPRESSO');
      expect(bean.beanMix).toBe('BLEND');
      expect(bean.qr_code).toBe('QR-1');
      expect(bean.bean_information.length).toBe(1);
      expect(bean.bean_information[0].country).toBe('Kenya');
      expect(bean.bean_information[0].purchasing_price).toBe(7);
      expect(bean.config.uuid).toBe('');
      expect(bean.attachments).toEqual([]);
    });

    it('known gap: the name of a custom roast of the roaster is dropped', async () => {
      settings.qr_scanner_information = true;

      await helper.addScannedQRBean(
        serverBean({ roast: 13, roast_custom: 'Extra dark' }),
      );

      const bean = opened()[0].componentProps.bean_template as Bean;
      expect(bean.roast).toBe('CUSTOM_ROAST');
      expect(bean.roast_custom).toBe('');
    });

    it('tells that the scan worked and counts it, without what was scanned', async () => {
      settings.qr_scanner_information = true;

      await helper.addScannedQRBean(serverBean());

      expect(showInfoToast.calls.allArgs()).toEqual([
        ['QR.BEAN_SUCCESSFULLY_SCANNED'],
      ]);
      expect(trackEvent.calls.allArgs()).toEqual([['QR', 'SCAN_SUCCESSFULLY']]);
      expect(steps).toEqual([
        'spinner',
        'spinner hidden',
        'create bean-add',
        'present bean-add',
        'dismissed bean-add',
      ]);
      expect(showMessage).not.toHaveBeenCalled();
    });

    it('explains the scanner first to someone who has not seen that yet', async () => {
      settings.qr_scanner_information = false;

      await helper.addScannedQRBean(serverBean());

      expect(opened().map((_modal) => _modal.component)).toEqual([
        QrCodeScannerPopoverComponent,
        BeansAddComponent,
      ]);
      expect(opened()[0]).toEqual({
        component: QrCodeScannerPopoverComponent,
        id: QrCodeScannerPopoverComponent.POPOVER_ID,
      });
      expect(steps.slice(2, 5)).toEqual([
        `create ${QrCodeScannerPopoverComponent.POPOVER_ID}`,
        `present ${QrCodeScannerPopoverComponent.POPOVER_ID}`,
        `dismissed ${QrCodeScannerPopoverComponent.POPOVER_ID}`,
      ]);
    });

    it('does not explain the scanner again', async () => {
      settings.qr_scanner_information = true;

      await helper.__checkQRCodeScannerInformationPage();

      expect(createModal).not.toHaveBeenCalled();
    });

    it('reports an answer that cannot be read as a bean and opens no add dialog', async () => {
      settings.qr_scanner_information = true;

      await helper.addScannedQRBean(
        serverBean({ bean_information: undefined }),
      );

      expect(createModal).not.toHaveBeenCalled();
      expect(showMessage.calls.allArgs()).toEqual([ERROR_MESSAGE]);
      expect(steps).toEqual(['spinner', 'spinner hidden', 'message']);
    });

    it('known gap: counts and announces an answer that cannot be read as a successful scan', async () => {
      settings.qr_scanner_information = true;

      await helper.addScannedQRBean(
        serverBean({ bean_information: undefined }),
      );

      expect(showInfoToast.calls.allArgs()).toEqual([
        ['QR.BEAN_SUCCESSFULLY_SCANNED'],
      ]);
      expect(trackEvent.calls.allArgs()).toEqual([['QR', 'SCAN_SUCCESSFULLY']]);
    });

    it('says that a bean is not approved yet', async () => {
      await helper.addScannedQRBean(
        serverBean({
          error: {
            errorCode: 'beannotapproved',
            message: '',
            messageDetail: '',
            statusCode: 403,
          },
        }),
      );

      expect(showMessage.calls.allArgs()).toEqual([
        ['QR.SERVER.BEAN_NOT_APPROVED', 'ERROR_OCCURED', undefined, true],
      ]);
      expect(trackEvent.calls.allArgs()).toEqual([['QR', 'SCAN_FAILED']]);
      expect(steps).toEqual(['spinner hidden', 'message']);
      expect(createModal).not.toHaveBeenCalled();
      expect(showInfoToast).not.toHaveBeenCalled();
    });

    it('reports every other error of the server as a general one', async () => {
      await helper.addScannedQRBean(
        serverBean({
          error: {
            errorCode: 'BEANNOTAPPROVED',
            message: '',
            messageDetail: '',
            statusCode: 500,
          },
        }),
      );

      expect(showMessage.calls.allArgs()).toEqual([ERROR_MESSAGE]);
      expect(trackEvent.calls.allArgs()).toEqual([['QR', 'SCAN_FAILED']]);
      expect(createModal).not.toHaveBeenCalled();
    });
  });

  describe('a bean shared by another user', () => {
    let shareService: ShareService;
    let share: jasmine.Spy;

    /** The text the sender shares for the bean, as the real sender builds it. */
    async function sharedCode(_bean: Bean): Promise<string> {
      await shareService.shareBean(_bean);
      const link = (share.calls.mostRecent().args[0] as ShareOptions).text;
      return link
        .substring(link.indexOf('?') + 1)
        .split('&')
        .map((_part) => _part.substring(_part.indexOf('=') + 1))
        .join('');
    }

    /** A code that was not built by this version of the app. */
    function foreignCode(_fields: Partial<BeanProto>): string {
      const bytes = BeanProto.encode(BeanProto.fromJSON(_fields)).finish();
      return btoa(String.fromCharCode(...bytes));
    }

    function sendersBean(): Bean {
      const bean = new Bean();
      bean.config.uuid = 'senders-uuid';
      bean.config.unix_timestamp = 1700000000;
      bean.name = 'Geteilte Bohne – ☕';
      bean.roaster = 'Rösterei';
      bean.note = 'x'.repeat(900);
      bean.weight = 250;
      bean.cost = 12.5;
      bean.roastingDate = '2026-03-01T23:30:00.000Z';
      bean.roast = 'CITY_ROAST' as ROASTS_ENUM;
      bean.beanMix = 'BLEND' as BEAN_MIX_ENUM;
      bean.bean_roasting_type = 'OMNI' as BEAN_ROASTING_TYPE_ENUM;
      bean.rating = 4;
      bean.favourite = true;
      bean.attachments = ['senders-photo.jpg'];
      bean.bean_information = [
        { country: 'Kenya', percentage: 60 },
        { country: 'Peru', percentage: 40 },
      ] as Bean['bean_information'];
      bean.cupped_flavor.predefined_flavors = { 12: true, 30: true };
      bean.cupped_flavor.custom_flavors = ['Marzipan'];
      return bean;
    }

    function template(): Bean {
      return opened()[0].componentProps.bean_template as Bean;
    }

    beforeEach(() => {
      shareService = TestBed.inject(ShareService);
      share = spyOn(ShareWeb.prototype, 'share').and.resolveTo({});
    });

    it('logs only the length of the link of a shared bean', async () => {
      log.debug.calls.reset();

      const code = await sharedCode(sendersBean());

      const link = (share.calls.mostRecent().args[0] as ShareOptions).text;
      expect(log.debug.calls.allArgs()).toEqual([
        [`Share bean link (${link.length} chars)`],
      ]);
      expect(code.length).toBeGreaterThan(400);
    });

    it('opens the add dialog with what the sender shared', async () => {
      await helper.addUserSharedBean(await sharedCode(sendersBean()));

      expect(opened().length).toBe(1);
      expect(opened()[0].component).toBe(BeansAddComponent);
      expect(opened()[0].id).toBe('bean-add');
      expect(opened()[0].componentProps.user_shared_bean).toBe(template());
      expect(template()).toEqual(jasmine.any(Bean));
      expect(template().name).toBe('Geteilte Bohne – ☕');
      expect(template().roaster).toBe('Rösterei');
      expect(template().note).toBe('x'.repeat(900));
      expect(template().weight).toBe(250);
      expect(template().cost).toBe(12.5);
      expect(template().roastingDate).toBe('2026-03-01T23:30:00.000Z');
      expect(template().roast).toBe('CITY_ROAST');
      expect(template().beanMix).toBe('BLEND');
      expect(template().bean_roasting_type).toBe('OMNI');
      expect(
        template().bean_information.map((_info) => [
          _info.country,
          _info.percentage,
        ]),
      ).toEqual([
        ['Kenya', 60],
        ['Peru', 40],
      ]);
      expect(template().cupped_flavor.predefined_flavors).toEqual({
        12: true,
        30: true,
      });
      expect(template().cupped_flavor.custom_flavors).toEqual(['Marzipan']);
    });

    it('makes it an entry of the receiver: shared, unrated, without the photos and the identity of the sender', async () => {
      await helper.addUserSharedBean(await sharedCode(sendersBean()));

      expect(template().shared).toBeTrue();
      expect(template().favourite).toBeFalse();
      expect(template().rating).toBe(0);
      expect(template().attachments).toEqual([]);
      expect({ ...template().config }).toEqual({ uuid: '', unix_timestamp: 0 });
      expect('external_images' in template()).toBeFalse();
      expect(steps).toEqual([
        'spinner hidden',
        'create bean-add',
        'present bean-add',
        'dismissed bean-add',
        'spinner hidden',
      ]);
      expect(log.error).not.toHaveBeenCalled();
      expect(requests).toEqual([]);
    });

    it('takes a bean of which only the name is known', async () => {
      const bean = new Bean();
      bean.name = 'Only a name';

      await helper.addUserSharedBean(await sharedCode(bean));

      expect(template().name).toBe('Only a name');
      expect(template().weight).toBe(0);
      expect(template().bean_information).toEqual([]);
      expect(template().cupped_flavor.predefined_flavors).toEqual({});
      expect(template().roast).toBe('UNKNOWN');
      expect(template().beanMix).toBe('SINGLE_ORIGIN');
      expect(template().bean_roasting_type).toBe('UNKNOWN');
    });

    it('takes a single flavor', async () => {
      const bean = sendersBean();
      bean.cupped_flavor.predefined_flavors = { 7: true };

      await helper.addUserSharedBean(await sharedCode(bean));

      expect(template().cupped_flavor.predefined_flavors).toEqual({ 7: true });
    });

    it('keeps the defaults of a new bean for what a code leaves out', async () => {
      await helper.addUserSharedBean(foreignCode({ name: 'Only a name' }));

      const expected = new Bean();
      expected.name = 'Only a name';
      expected.shared = true;
      // The three lists of choices have no default of their own here.
      expected.roast = undefined;
      expected.beanMix = undefined;
      expected.bean_roasting_type = undefined;
      expect({ ...template() }).toEqual({ ...expected });
    });

    it('does not trust a code that claims an identity, photos, a rating or a favourite', async () => {
      await helper.addUserSharedBean(
        foreignCode({
          name: 'Foreign',
          config: { uuid: 'uuid-of-an-entry-here', unix_timestamp: 5 },
          attachments: ['photo-of-an-entry-here.jpg'],
          favourite: true,
          rating: 5,
          shared: false,
        }),
      );

      expect({ ...template().config }).toEqual({ uuid: '', unix_timestamp: 0 });
      expect(template().attachments).toEqual([]);
      expect(template().favourite).toBeFalse();
      expect(template().rating).toBe(0);
      expect(template().shared).toBeTrue();
    });

    it('downloads the pictures a code links to before the add dialog opens', async () => {
      contentTypes.set('https://pics.example/a', 'image/png');
      contentTypes.set('https://pics.example/b', 'text/html');

      await helper.addUserSharedBean(
        foreignCode({
          name: 'With pictures',
          external_images: [
            'https://pics.example/a',
            'https://pics.example/b',
            'https://pics.example/gone',
          ],
        }),
      );

      expect(requests).toEqual([
        'HEAD https://pics.example/a',
        'HEAD https://pics.example/b',
        'HEAD https://pics.example/gone',
      ]);
      expect(template().attachments).toEqual(['downloaded-1.png']);
      expect('external_images' in template()).toBeFalse();
      expect(steps[0]).toBe('spinner hidden');
      expect(opened().length).toBe(1);
    });

    it('brings a bean the sender had archived as an active one and leaves it archived for the sender', async () => {
      const bean = sendersBean();
      bean.finished = true;

      const code = await sharedCode(bean);
      await helper.addUserSharedBean(code);

      expect(
        BeanProto.decode(
          Uint8Array.from(atob(code), (_char) => _char.charCodeAt(0)),
        ).finished,
      ).toBeFalse();
      expect(template().finished).toBeFalse();
      expect(bean.finished).toBeTrue();
    });

    it('brings a bean as an active one also from a code that says it is archived', async () => {
      await helper.addUserSharedBean(
        foreignCode({ name: 'Archived elsewhere', finished: true }),
      );

      expect(template().finished).toBeFalse();
    });

    it('known gap: leaves the frozen state behind, but brings the uuids of the green bean and the roasting machine of the sender', async () => {
      const bean = sendersBean();
      bean.frozenId = 'F1';
      bean.frozenDate = '2026-01-10T08:00:00.000Z';
      bean.bean_roast_information.bean_uuid = 'senders-green-bean';
      bean.bean_roast_information.roaster_machine = 'senders-machine';

      await helper.addUserSharedBean(await sharedCode(bean));

      expect(template().frozenId).toBe('');
      expect(template().frozenDate).toBe('');
      expect(template().bean_roast_information.bean_uuid).toBe(
        'senders-green-bean',
      );
      expect(template().bean_roast_information.roaster_machine).toBe(
        'senders-machine',
      );
    });

    for (const [name, code] of [
      ['is no base64', '%%%'],
      ['is cut off', 'CgVBbHBoYRIK'],
      ['is missing', undefined],
      ['is empty', ''],
    ]) {
      it(`opens nothing and says that it cannot be read when the code ${name}`, async () => {
        await expectAsync(helper.addUserSharedBean(code)).toBeResolved();

        expect(createModal).not.toHaveBeenCalled();
        expect(showMessage.calls.allArgs()).toEqual([
          ['USER_BEAN_SHARE_CODE_UNREADABLE', 'ERROR_OCCURED', undefined, true],
        ]);
        // The spinner of the link is gone before the message.
        expect(steps).toEqual(['spinner hidden', 'message', 'spinner hidden']);
      });
    }

    it('says in English and German that a shared bean cannot be read', () => {
      expect(en.USER_BEAN_SHARE_CODE_UNREADABLE).toContain('could not be read');
      expect(de.USER_BEAN_SHARE_CODE_UNREADABLE).toContain(
        'konnte nicht gelesen werden',
      );
    });

    it('known gap: a roast the receiver does not know arrives as no roast at all', async () => {
      const bean = sendersBean();
      bean.roast = 'ROAST_OF_A_NEWER_VERSION' as ROASTS_ENUM;

      await helper.addUserSharedBean(await sharedCode(bean));

      expect(template().roast).toBeUndefined();
      expect(template().name).toBe('Geteilte Bohne – ☕');
    });

    it('logs why a code could not be read', async () => {
      await helper.addUserSharedBean('%%%');

      expect(log.error).toHaveBeenCalledTimes(1);
      expect(log.error.calls.argsFor(0)[0]).toContain('not correctly encoded');
    });
  });

  describe('the pictures of a shared bean', () => {
    it('downloads JPEG and PNG pictures and attaches them in order', async () => {
      contentTypes.set('https://pics.example/a', 'image/jpeg');
      contentTypes.set('https://pics.example/b', 'image/png');
      contentTypes.set('https://pics.example/c', 'image/jpg');
      const bean = new Bean();
      bean.attachments = ['own.jpg'];

      await helper.downloadAndAddAttachAttachments(bean, [
        'https://pics.example/a',
        'https://pics.example/b',
        'https://pics.example/c',
      ]);

      expect(requests).toEqual([
        'HEAD https://pics.example/a',
        'HEAD https://pics.example/b',
        'HEAD https://pics.example/c',
      ]);
      expect(downloadExternalFile.calls.allArgs()).toEqual([
        ['https://pics.example/a', undefined, '.jpg'],
        ['https://pics.example/b', undefined, '.png'],
        ['https://pics.example/c', undefined, '.jpg'],
      ]);
      expect(bean.attachments).toEqual([
        'own.jpg',
        'downloaded-1.jpg',
        'downloaded-2.png',
        'downloaded-3.jpg',
      ]);
      expect(log.error).not.toHaveBeenCalled();
    });

    for (const contentType of [
      'image/webp',
      'text/html',
      'application/zip',
      'image/jpeg; charset=binary',
      'IMAGE/PNG',
      '',
    ]) {
      it(`leaves out what answers as "${contentType}", without a word`, async () => {
        contentTypes.set('https://pics.example/a', contentType);
        const bean = new Bean();

        await helper.downloadAndAddAttachAttachments(bean, [
          'https://pics.example/a',
        ]);

        expect(downloadExternalFile).not.toHaveBeenCalled();
        expect(bean.attachments).toEqual([]);
        expect(log.error).not.toHaveBeenCalled();
      });
    }

    it('goes on with the next picture when one cannot be reached or stored', async () => {
      contentTypes.set('https://pics.example/b', 'image/png');
      contentTypes.set('https://pics.example/c', 'image/png');
      downloadExternalFile.and.callFake((_url: string) =>
        _url.endsWith('/b')
          ? Promise.reject(new Error('disk full'))
          : Promise.resolve('c.png'),
      );
      const bean = new Bean();

      await helper.downloadAndAddAttachAttachments(bean, [
        'https://pics.example/gone',
        'https://pics.example/b',
        'https://pics.example/c',
      ]);

      expect(bean.attachments).toEqual(['c.png']);
      expect(
        log.error.calls.allArgs().map((_args) => String(_args[0])),
      ).toEqual([
        'Error downloading attachments',
        'Error downloading attachments',
      ]);
      expect(showMessage).not.toHaveBeenCalled();
    });

    it('asks no server for a bean without pictures', async () => {
      const bean = new Bean();

      await helper.downloadAndAddAttachAttachments(bean, []);

      expect(requests).toEqual([]);
      expect(bean.attachments).toEqual([]);
    });

    it('fails for a list of pictures that is missing', async () => {
      await expectAsync(
        helper.downloadAndAddAttachAttachments(new Bean(), undefined),
      ).toBeRejectedWithError(TypeError);
    });
  });

  describe('counting the bean fields in use', () => {
    it('sends one event per field that is switched on, in one go', () => {
      for (const key of Object.keys(settings.bean_manage_parameters)) {
        settings.bean_manage_parameters[key] = false;
      }
      settings.bean_manage_parameters.name = true;
      settings.bean_manage_parameters.co2e_kg = true;

      helper.logUsedBeanParameters();

      expect(trackBulkEvents.calls.allArgs()).toEqual([
        [
          [
            { category: 'BEAN', action: 'BEAN_PARAMETER_USED', name: 'name' },
            {
              category: 'BEAN',
              action: 'BEAN_PARAMETER_USED',
              name: 'co2e_kg',
            },
          ],
        ],
      ]);
      expect(trackEvent).not.toHaveBeenCalled();
    });

    it('sends nothing when no field is switched on', () => {
      for (const key of Object.keys(settings.bean_manage_parameters)) {
        settings.bean_manage_parameters[key] = key === 'name' ? 'true' : false;
      }

      helper.logUsedBeanParameters();

      expect(trackBulkEvents).not.toHaveBeenCalled();
    });
  });

  it('answers as the instance that was created first', () => {
    expect(UIBeanHelper.getInstance()).toEqual(jasmine.any(UIBeanHelper));
  });
});
