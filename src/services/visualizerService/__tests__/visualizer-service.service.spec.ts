import { TestBed } from '@angular/core/testing';

import BaristamodeBrew from '../../../classes/brew/baristamodeBrew';
import { Brew, BrewInstanceHelper } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';
import { StorageClass } from '../../../classes/storageClass';
import { MemoryDatabase } from '../../../test-utils/memory-database';
import { UIAlert } from '../../uiAlert';
import { UIBaristamodeBrewStorage } from '../../uiBaristamodeBrewStorage';
import { UIBeanStorage } from '../../uiBeanStorage';
import { UIBrewHelper } from '../../uiBrewHelper';
import { UIBrewStorage } from '../../uiBrewStorage';
import { UIFileHelper } from '../../uiFileHelper';
import { UILog } from '../../uiLog';
import { UIMillStorage } from '../../uiMillStorage';
import { UIPreparationStorage } from '../../uiPreparationStorage';
import { UISettingsStorage } from '../../uiSettingsStorage';
import { UIToast } from '../../uiToast';
import { UIWaterStorage } from '../../uiWaterStorage';
import { VisualizerService } from '../visualizer-service.service';

const NO_FLOW_ERROR =
  'Cannot upload visualizer shot because the data does not contain any brewflow';
const IMPORT_FAILED = [
  'VISUALIZER_SHOT_IMPORT_FAILED',
  'ERROR_OCCURED',
  'OK',
  true,
];
const SAVE_FAILED_MESSAGE = ['STORAGE_SAVE_FAILED', undefined, undefined, true];

interface Uploaded {
  application: string;
  visualizerId: string;
  brew: Record<string, unknown>;
  bean?: Record<string, unknown>;
  mill?: Record<string, unknown>;
  water?: Record<string, unknown>;
  preparation: Record<string, unknown>;
  brewFlow: Record<string, unknown>;
}

interface StoredBrew {
  config: { uuid: string; rev?: number };
  customInformation: { visualizer_id: string };
}

describe('VisualizerService', () => {
  let database: MemoryDatabase;
  let service: VisualizerService;
  let settings: Settings;
  let brews: UIBrewStorage;
  let baristaBrews: UIBaristamodeBrewStorage;

  let fetchSpy: jasmine.Spy;
  /** What the server answers next. */
  let answer: () => Promise<Response>;
  let flowFiles: Map<string, unknown>;
  let readFlow: jasmine.Spy;
  let showInfoToastBottom: jasmine.Spy;
  let showMessage: jasmine.Spy;
  let addBrewFromVisualizerWithGraph: jasmine.Spy;
  let log: { error: jasmine.Spy; info: jasmine.Spy };

  const json = (_body: unknown, _status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(_body), {
        status: _status,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

  function request(_index = 0): { url: string; options: RequestInit } {
    const [url, options] = fetchSpy.calls.argsFor(_index) as [
      string,
      RequestInit,
    ];
    return { url: String(url), options };
  }

  async function uploaded(_index = 0): Promise<Uploaded> {
    const file = (request(_index).options.body as FormData).get('file') as File;
    return JSON.parse(await file.text()) as Uploaded;
  }

  function storedBrews(_key = 'BREWS'): StoredBrew[] {
    return database.values.get(_key) as StoredBrew[];
  }

  beforeEach(async () => {
    database = new MemoryDatabase();
    (
      StorageClass as unknown as { refusedWriteReported: boolean }
    ).refusedWriteReported = false;
    settings = new Settings();
    settings.visualizer_url = 'https://visualizer.example/';
    settings.visualizer_username = 'user@example.org';
    settings.visualizer_password = 'secret';

    flowFiles = new Map<string, unknown>([
      ['brews/brew-1_flow_profile.json', { weight: [{ actual_weight: 36 }] }],
      ['baristamode/barista-1_flow_profile.json', { pressureFlow: [1, 2] }],
    ]);
    readFlow = jasmine
      .createSpy('readInternalJSONFile')
      .and.callFake((_path: string) =>
        flowFiles.has(_path)
          ? Promise.resolve(structuredClone(flowFiles.get(_path)))
          : Promise.reject(new Error('File does not exist')),
      );
    showInfoToastBottom = jasmine.createSpy('showInfoToastBottom');
    showMessage = jasmine.createSpy('showMessage').and.resolveTo();
    addBrewFromVisualizerWithGraph = jasmine
      .createSpy('addBrewFromVisualizerWithGraph')
      .and.resolveTo();
    answer = () => json({ id: 'shot-1' });
    // The network is the boundary; the plugins of the browser build use it too.
    fetchSpy = spyOn(window, 'fetch').and.callFake(() => answer());

    const alert = { showMessage };
    const providers = database.providers();
    (UIAlert.getInstance as jasmine.Spy).and.returnValue(alert);
    TestBed.configureTestingModule({
      providers: [
        ...providers,
        { provide: UIAlert, useValue: alert },
        { provide: UIToast, useValue: { showInfoToastBottom } },
        { provide: UIFileHelper, useValue: { readInternalJSONFile: readFlow } },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings },
        },
        { provide: UIBrewHelper, useValue: { addBrewFromVisualizerWithGraph } },
      ],
    });
    log = TestBed.inject(UILog) as unknown as typeof log;

    database.values.set('BEANS', [
      {
        config: { uuid: 'bean-1' },
        name: 'Alpha',
        roaster: 'Roastery',
        note: 'Bean note',
        cost: 12.5,
        weight: 250,
        attachments: ['bean-photo.jpg'],
        internal_share_code: 'share-code',
      },
    ]);
    database.values.set('MILL', [{ config: { uuid: 'mill-1' }, name: 'Mill' }]);
    database.values.set('PREPARATION', [
      {
        config: { uuid: 'prep-1' },
        name: 'Espresso machine',
        style_type: 'ESPRESSO',
        type: 'PORTAFILTER',
      },
      {
        config: { uuid: 'prep-2' },
        name: 'French press',
        style_type: 'FULL_IMMERSION',
        type: 'FRENCH_PRESS',
      },
    ]);
    database.values.set('WATER', [
      { config: { uuid: 'water-1' }, name: 'Tap', calcium: 40 },
    ]);
    database.values.set('BREWS', [
      { config: { uuid: 'other', rev: 4 }, customInformation: {} },
    ]);
    database.values.set('BARISTAMODE_BREWS', []);

    const beans = TestBed.inject(UIBeanStorage);
    const mills = TestBed.inject(UIMillStorage);
    const preparations = TestBed.inject(UIPreparationStorage);
    const waters = TestBed.inject(UIWaterStorage);
    brews = TestBed.inject(UIBrewStorage);
    baristaBrews = TestBed.inject(UIBaristamodeBrewStorage);
    for (const storage of [
      beans,
      mills,
      preparations,
      waters,
      brews,
      baristaBrews,
    ]) {
      await storage.initializeStorage();
    }
    // A brew looks its bean, mill, preparation and water up by these.
    spyOn(UIBeanStorage, 'getInstance').and.returnValue(beans);
    spyOn(UIMillStorage, 'getInstance').and.returnValue(mills);
    spyOn(UIPreparationStorage, 'getInstance').and.returnValue(preparations);
    spyOn(UIWaterStorage, 'getInstance').and.returnValue(waters);
    BrewInstanceHelper.setEntryAmountBackToZero();

    service = TestBed.inject(VisualizerService);
  });

  afterEach(() => {
    BrewInstanceHelper.setEntryAmountBackToZero();
  });

  /** A stored brew with a graph, as the brew list hands it over. */
  async function storedBrew(_changes: Partial<Brew> = {}): Promise<Brew> {
    const brew = new Brew();
    Object.assign(brew, {
      bean: 'bean-1',
      mill: 'mill-1',
      method_of_preparation: 'prep-1',
      water: 'water-1',
      grind_size: '2.5',
      grind_weight: 18,
      brew_beverage_quantity: 36,
      brew_quantity: 300,
      brew_time: 27,
      note: 'Brew note',
      rating: 4,
      flow_profile: 'brews/brew-1_flow_profile.json',
      ..._changes,
    });
    const added = (await brews.add(brew, { uuid: 'brew-1' })) as Brew;
    database.set.calls.reset();
    return added;
  }

  describe('uploading a brew', () => {
    it('posts the brew to the server of the settings as a JSON file', async () => {
      const brew = await storedBrew();

      await service.uploadToVisualizer(brew);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(request().url).toBe('https://visualizer.example/api/shots/upload');
      expect(request().options.method).toBe('POST');
      const file = (request().options.body as FormData).get('file') as File;
      expect(file.name).toBe('visualizer.json');
      expect(file.type).toBe('application/json');
      expect([...(request().options.body as FormData).keys()]).toEqual([
        'file',
      ]);
    });

    it('signs in with the name and the password of the settings', async () => {
      const brew = await storedBrew();

      await service.uploadToVisualizer(brew);

      expect(request().options.headers).toEqual({
        Authorization: 'Basic ' + btoa('user@example.org:secret'),
      });
    });

    it('sends the brew with its bean, mill, preparation, water and graph', async () => {
      const brew = await storedBrew();

      await service.uploadToVisualizer(brew);

      const sent = await uploaded();
      expect(sent.application).toBe('BEANCONQUEROR');
      expect(sent.visualizerId).toBe('');
      expect(sent.brew.grind_size).toBe('2.5');
      expect(sent.brew.grind_weight).toBe(18);
      expect(sent.brew.brew_beverage_quantity).toBe(36);
      expect(sent.brew.brew_time).toBe(27);
      expect(sent.brew.note).toBe('Brew note');
      expect(sent.brew.rating).toBe(4);
      // visualizer.coffee reads the time of the shot from here.
      expect(sent.brew.config).toEqual({
        unix_timestamp: brew.config.unix_timestamp,
      });
      expect(sent.bean.name).toBe('Alpha');
      expect(sent.bean.roaster).toBe('Roastery');
      expect(sent.bean.note).toBe('Bean note');
      expect(sent.bean.cost).toBe(12.5);
      expect(sent.mill).toEqual({ name: 'Mill' });
      expect(sent.preparation).toEqual({
        name: 'Espresso machine',
        style_type: 'ESPRESSO',
        type: 'PORTAFILTER',
      });
      expect(sent.water.name).toBe('Tap');
      expect(sent.water.calcium).toBe(40);
      expect(sent.brewFlow.weight).toEqual([{ actual_weight: 36 }]);
      expect(readFlow.calls.allArgs()).toEqual([
        ['brews/brew-1_flow_profile.json'],
      ]);
    });

    it('sends a grind setting of 0', async () => {
      const brew = await storedBrew({ grind_size: 0 as unknown as string });

      await service.uploadToVisualizer(brew);

      expect((await uploaded()).brew.grind_size).toBe(0);
    });

    it('sends neither the place of the brew nor photos, references or codes', async () => {
      const brew = await storedBrew({
        coordinates: {
          latitude: 52.5,
          longitude: 13.4,
        } as Brew['coordinates'],
        attachments: ['brew-photo.jpg'],
      });

      await service.uploadToVisualizer(brew);

      const sent = await uploaded();
      const text = JSON.stringify(sent);
      expect(text).not.toContain('52.5');
      expect(text).not.toContain('brew-photo.jpg');
      expect(text).not.toContain('bean-photo.jpg');
      expect(text).not.toContain('share-code');
      expect(text).not.toContain('secret');
      // No id, no device and no change info of any entry.
      expect(text).not.toContain('brew-1');
      expect(text).not.toContain('device-a');
      for (const key of [
        'uuid',
        'updated_by',
        'rev',
        'updated_at',
        'created_at',
      ]) {
        expect(text).not.toContain(`"${key}"`);
      }
      expect(text).not.toContain('bean-1');
      expect(text).not.toContain('mill-1');
      expect(text).not.toContain('prep-1');
      expect(text).not.toContain('water-1');
      expect(Object.keys(sent).sort()).toEqual([
        'application',
        'bean',
        'brew',
        'brewFlow',
        'mill',
        'preparation',
        'visualizerId',
        'water',
      ]);
    });

    it('adds the extraction yield of a brew with a TDS: drink for espresso, water for immersion', async () => {
      const espresso = await storedBrew({ tds: 9 });
      await service.uploadToVisualizer(espresso);
      expect((await uploaded(0)).brew.ey).toBe(18);
      expect((await uploaded(0)).brew.tds).toBe(9);

      espresso.method_of_preparation = 'prep-2';
      espresso.tds = 1.35;
      await service.uploadToVisualizer(espresso);
      expect((await uploaded(1)).brew.ey).toBe(22.5);
    });

    it('sends an extraction yield of 0 without a TDS or without a ground weight', async () => {
      const brew = await storedBrew({ tds: 0 });
      await service.uploadToVisualizer(brew);
      expect((await uploaded(0)).brew.ey).toBe(0);

      brew.tds = 9;
      brew.grind_weight = 0;
      await service.uploadToVisualizer(brew);
      // Dividing by 0 gives no number JSON knows.
      expect((await uploaded(1)).brew.ey).toBeNull();
    });

    it('stores the id of the shot with the brew and tells that it worked', async () => {
      const brew = await storedBrew();

      await service.uploadToVisualizer(brew);

      expect(brew.customInformation.visualizer_id).toBe('shot-1');
      expect(storedBrews().map((_brew) => _brew.config.uuid)).toEqual([
        'other',
        'brew-1',
      ]);
      expect(storedBrews()[1].customInformation.visualizer_id).toBe('shot-1');
      expect(storedBrews()[0].customInformation).toEqual(
        {} as StoredBrew['customInformation'],
      );
      expect(storedBrews()[0].config.rev).toBe(4);
      expect(storedBrews()[1].config.rev).toBe(2);
      expect(database.written()).toEqual(['BREWS']);
      expect(showInfoToastBottom.calls.allArgs()).toEqual([
        ['VISUALIZER.SHOT.UPLOAD_SUCCESSFULLY'],
      ]);
    });

    it('uploads again under the id the shot already has', async () => {
      const brew = await storedBrew();
      brew.customInformation.visualizer_id = 'shot-old';
      answer = () => json({ id: 'shot-new' });

      await service.uploadToVisualizer(brew);

      expect((await uploaded()).visualizerId).toBe('shot-old');
      expect(storedBrews()[1].customInformation.visualizer_id).toBe('shot-new');
    });

    it('stays silent when no toast is wanted', async () => {
      const brew = await storedBrew();

      await service.uploadToVisualizer(brew, false);

      expect(storedBrews()[1].customInformation.visualizer_id).toBe('shot-1');
      expect(showInfoToastBottom).not.toHaveBeenCalled();
    });

    for (const flow of ['', undefined, null]) {
      it(`does nothing for a brew without a graph (${JSON.stringify(flow)})`, async () => {
        const brew = await storedBrew({ flow_profile: flow });

        await expectAsync(service.uploadToVisualizer(brew)).toBeResolved();

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(readFlow).not.toHaveBeenCalled();
        expect(database.set).not.toHaveBeenCalled();
        expect(showInfoToastBottom).not.toHaveBeenCalled();
      });
    }

    it('uploads nothing and fails when the file of the graph is gone, without a toast', async () => {
      const brew = await storedBrew({
        flow_profile: 'brews/gone_flow_profile.json',
      });

      await expectAsync(service.uploadToVisualizer(brew)).toBeRejectedWithError(
        NO_FLOW_ERROR,
      );

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(database.set).not.toHaveBeenCalled();
      expect(log.error.calls.allArgs()).toEqual([[NO_FLOW_ERROR]]);
      expect(showInfoToastBottom).not.toHaveBeenCalled();
    });

    it('uploads a brew whose bean, mill, preparation and water are gone with empty ones', async () => {
      const brew = await storedBrew({
        bean: 'gone',
        mill: 'gone',
        method_of_preparation: 'gone',
        water: 'gone',
      });

      await service.uploadToVisualizer(brew);

      const sent = await uploaded();
      expect(sent.bean.name).toBe('');
      expect(sent.mill.name).toBe('');
      expect(sent.preparation.name).toBe('');
      expect(sent.water.name).toBe('');
      expect(sent.brewFlow.weight).toEqual([{ actual_weight: 36 }]);
      expect(storedBrews()[1].customInformation.visualizer_id).toBe('shot-1');
    });

    it('known gap: uploads an empty graph when the brew cannot be put together', async () => {
      const brew = await storedBrew();
      spyOn(Brew.prototype, 'getMill').and.throwError('storage not ready');

      await service.uploadToVisualizer(brew);

      const sent = await uploaded();
      // The graph is never read, the empty one of a new upload goes out.
      expect(readFlow).not.toHaveBeenCalled();
      expect(sent.brewFlow.weight).toEqual([]);
      expect(sent.mill.name).toBe('');
      expect(storedBrews()[1].customInformation.visualizer_id).toBe('shot-1');
      expect(showInfoToastBottom.calls.allArgs()).toEqual([
        ['VISUALIZER.SHOT.UPLOAD_SUCCESSFULLY'],
      ]);
    });

    for (const [name, body] of [
      ['no id', { error: 'unauthorized' }],
      ['an empty id', { id: '' }],
      ['the id 0', { id: 0 }],
    ] as [string, unknown][]) {
      it(`fails, stores nothing and tells so when the server answers with ${name}`, async () => {
        const brew = await storedBrew();
        answer = () => json(body, 401);

        // Callers that do not catch it hand the error to the global handler,
        // which logs its message: it must not quote the server either.
        await expectAsync(
          service.uploadToVisualizer(brew),
        ).toBeRejectedWithError('Upload visualizer shot failed: Error');

        expect(brew.customInformation.visualizer_id).toBe('');
        expect(database.set).not.toHaveBeenCalled();
        expect(showInfoToastBottom.calls.allArgs()).toEqual([
          ['VISUALIZER.SHOT.UPLOAD_UNSUCCESSFULLY'],
        ]);
        // The answer of the server stays out of the app log.
        expect(log.error.calls.allArgs()).toEqual([
          ['Upload visualizer shot error occurred', 'Error'],
        ]);
      });
    }

    it('fails and tells so when the server cannot be reached or answers no JSON', async () => {
      const brew = await storedBrew();
      answer = () => Promise.reject(new TypeError('Failed to fetch'));
      await expectAsync(service.uploadToVisualizer(brew)).toBeRejectedWithError(
        'Upload visualizer shot failed: TypeError',
      );

      answer = () => Promise.resolve(new Response('<html>502</html>'));
      // The parse error of the browser quotes the start of the answer.
      await expectAsync(service.uploadToVisualizer(brew)).toBeRejectedWithError(
        'Upload visualizer shot failed: SyntaxError',
      );

      expect(database.set).not.toHaveBeenCalled();
      expect(showInfoToastBottom.calls.allArgs()).toEqual([
        ['VISUALIZER.SHOT.UPLOAD_UNSUCCESSFULLY'],
        ['VISUALIZER.SHOT.UPLOAD_UNSUCCESSFULLY'],
      ]);
      expect(log.error).toHaveBeenCalledTimes(2);
    });

    it('fails without a toast when none is wanted', async () => {
      const brew = await storedBrew();
      answer = () => Promise.reject(new TypeError('Failed to fetch'));

      await expectAsync(
        service.uploadToVisualizer(brew, false),
      ).toBeRejectedWithError('Upload visualizer shot failed: TypeError');

      expect(showInfoToastBottom).not.toHaveBeenCalled();
    });

    it('known gap: a password outside Latin-1 fails as an upload error before anything is sent', async () => {
      const brew = await storedBrew();
      settings.visualizer_password = 'пароль';

      await expectAsync(service.uploadToVisualizer(brew)).toBeRejected();

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(showInfoToastBottom.calls.allArgs()).toEqual([
        ['VISUALIZER.SHOT.UPLOAD_UNSUCCESSFULLY'],
      ]);
    });

    it('known gap: claims success when the id of the shot could not be stored', async () => {
      const brew = await storedBrew();
      database.failingWrites.add('BREWS');

      await expectAsync(service.uploadToVisualizer(brew)).toBeResolved();

      expect(storedBrews()[1].customInformation.visualizer_id).toBe('');
      expect(showMessage.calls.allArgs()).toEqual([SAVE_FAILED_MESSAGE]);
      expect(showInfoToastBottom.calls.allArgs()).toEqual([
        ['VISUALIZER.SHOT.UPLOAD_SUCCESSFULLY'],
      ]);
    });

    it('known gap: reports an uploaded shot as failed when the brew has no place for its id', async () => {
      const brew = await storedBrew();
      // Only data that was damaged or written by hand looks like this.
      brew.customInformation = null;

      await expectAsync(service.uploadToVisualizer(brew)).toBeRejectedWithError(
        'Upload visualizer shot failed: TypeError',
      );

      // The shot is on the server; every further attempt uploads it anew.
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(database.set).not.toHaveBeenCalled();
      expect(showInfoToastBottom.calls.allArgs()).toEqual([
        ['VISUALIZER.SHOT.UPLOAD_UNSUCCESSFULLY'],
      ]);
    });
  });

  describe('uploading a brew of the barista mode', () => {
    async function storedBaristaBrew(
      _changes: Partial<BaristamodeBrew> = {},
    ): Promise<BaristamodeBrew> {
      const brew = new BaristamodeBrew();
      Object.assign(brew, {
        method_of_preparation: 'prep-1',
        brew_time: 25,
        brew_beverage_quantity: 40,
        flow_profile: 'baristamode/barista-1_flow_profile.json',
        ..._changes,
      });
      const added = (await baristaBrews.add(brew, {
        uuid: 'barista-1',
      })) as BaristamodeBrew;
      database.set.calls.reset();
      return added;
    }

    it('sends the brew with its preparation and graph, without bean, mill and water', async () => {
      const brew = await storedBaristaBrew();

      await service.uploadBaristamodeBrewToVisualizer(brew);

      expect(request().url).toBe('https://visualizer.example/api/shots/upload');
      expect(request().options.method).toBe('POST');
      expect(request().options.headers).toEqual({
        Authorization: 'Basic ' + btoa('user@example.org:secret'),
      });
      const sent = await uploaded();
      expect(Object.keys(sent).sort()).toEqual([
        'application',
        'brew',
        'brewFlow',
        'preparation',
        'visualizerId',
      ]);
      expect(sent.brew.brew_time).toBe(25);
      expect(sent.brew.brew_beverage_quantity).toBe(40);
      expect(sent.brew.ey).toBe(0);
      expect(sent.preparation.name).toBe('Espresso machine');
      expect(sent.brewFlow.pressureFlow).toEqual([1, 2]);
    });

    it('stores the id of the shot with the brew of the barista mode only', async () => {
      const brew = await storedBaristaBrew();

      await service.uploadBaristamodeBrewToVisualizer(brew);

      expect(
        storedBrews('BARISTAMODE_BREWS')[0].customInformation.visualizer_id,
      ).toBe('shot-1');
      expect(database.written()).toEqual(['BARISTAMODE_BREWS']);
      expect(showInfoToastBottom.calls.allArgs()).toEqual([
        ['VISUALIZER.SHOT.UPLOAD_SUCCESSFULLY'],
      ]);
    });

    it('known gap: never sends the id a shot already has', async () => {
      const brew = await storedBaristaBrew();
      brew.customInformation.visualizer_id = 'shot-old';

      await service.uploadBaristamodeBrewToVisualizer(brew, false);

      expect((await uploaded()).visualizerId).toBe('');
      expect(showInfoToastBottom).not.toHaveBeenCalled();
    });

    it('does nothing for a brew without a graph', async () => {
      const brew = await storedBaristaBrew({ flow_profile: '' });

      await service.uploadBaristamodeBrewToVisualizer(brew);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(database.set).not.toHaveBeenCalled();
    });

    it('uploads nothing and fails when the file of the graph is gone', async () => {
      const brew = await storedBaristaBrew({
        flow_profile: 'baristamode/gone.json',
      });

      await expectAsync(
        service.uploadBaristamodeBrewToVisualizer(brew),
      ).toBeRejectedWithError(NO_FLOW_ERROR);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(showInfoToastBottom).not.toHaveBeenCalled();
    });

    it('fails, stores nothing and tells so when the server answers without an id', async () => {
      const brew = await storedBaristaBrew();
      answer = () => json({});

      await expectAsync(
        service.uploadBaristamodeBrewToVisualizer(brew),
      ).toBeRejectedWithError('Upload visualizer shot failed: Error');

      expect(log.error.calls.allArgs()).toEqual([
        ['Upload visualizer shot error occurred', 'Error'],
      ]);
      expect(database.set).not.toHaveBeenCalled();
      expect(showInfoToastBottom.calls.allArgs()).toEqual([
        ['VISUALIZER.SHOT.UPLOAD_UNSUCCESSFULLY'],
      ]);

      showInfoToastBottom.calls.reset();
      await expectAsync(
        service.uploadBaristamodeBrewToVisualizer(brew, false),
      ).toBeRejected();
      expect(showInfoToastBottom).not.toHaveBeenCalled();
    });
  });

  describe('importing a shared shot', () => {
    const flow = { weight: [{ actual_weight: 30 }] };
    const shot = { brewdata: { application: 'BEANCONQUEROR', brewFlow: flow } };

    it('asks visualizer.coffee for the shot with its data', async () => {
      answer = () => json(shot);

      await service.importShotWithSharedCode('AB CD&x=1');

      expect(fetchSpy.calls.allArgs()).toEqual([
        [
          'https://visualizer.coffee/api/shots/shared?code=AB+CD%26x%3D1&with_data=1',
        ],
      ]);
    });

    it('opens the brew form with the graph of the shot', async () => {
      answer = () => json(shot);

      await service.importShotWithSharedCode('ABCD');

      expect(addBrewFromVisualizerWithGraph.calls.allArgs()).toEqual([[flow]]);
      expect(showMessage).not.toHaveBeenCalled();
      expect(database.set).not.toHaveBeenCalled();
    });

    it('takes the first shot of a list', async () => {
      answer = () => json([shot, { brewdata: { application: 'OTHER' } }]);

      await service.importShotWithSharedCode('ABCD');

      expect(addBrewFromVisualizerWithGraph.calls.allArgs()).toEqual([[flow]]);
      expect(showMessage).not.toHaveBeenCalled();
    });

    for (const [name, body] of [
      ['is from another app', { brewdata: { application: 'DECENT' } }],
      [
        'is from another app though it has a graph',
        { brewdata: { application: 'beanconqueror', brewFlow: flow } },
      ],
      ['has no graph', { brewdata: { application: 'BEANCONQUEROR' } }],
      ['has no data', { id: 'shot-1' }],
      ['is an error', { error: 'not found' }],
      ['is an empty list', []],
      ['is a list of shots without data', [{ id: 'shot-1' }]],
      ['is no object', 'not found'],
      ['is nothing', null],
    ] as [string, unknown][]) {
      it(`reports the import as failed when the answer ${name}`, async () => {
        answer = () => json(body);

        await expectAsync(
          service.importShotWithSharedCode('ABCD'),
        ).toBeResolved();

        expect(addBrewFromVisualizerWithGraph).not.toHaveBeenCalled();
        expect(showMessage.calls.allArgs()).toEqual([IMPORT_FAILED]);
      });
    }

    it('takes a list of shots without data as an answer, not as a fault', async () => {
      answer = () => json([{ id: 'shot-1' }]);

      await service.importShotWithSharedCode('ABCD');

      expect(showMessage.calls.allArgs()).toEqual([IMPORT_FAILED]);
      expect(log.error).not.toHaveBeenCalled();
    });

    it('reports the import as failed when the server cannot be reached or answers no JSON', async () => {
      answer = () => Promise.reject(new TypeError('Failed to fetch'));
      await service.importShotWithSharedCode('ABCD');

      answer = () => Promise.resolve(new Response('<html>'));
      await service.importShotWithSharedCode('ABCD');

      expect(showMessage.calls.allArgs()).toEqual([
        IMPORT_FAILED,
        IMPORT_FAILED,
      ]);
      expect(log.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('checking the account', () => {
    it('asks the server of the settings who is signed in', async () => {
      answer = () => json({ id: 7, name: 'User' });

      expect(await service.checkConnection()).toBeTrue();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(request().url).toBe('https://visualizer.example/api/me');
      expect(new Headers(request().options.headers).get('Authorization')).toBe(
        'Basic ' + btoa('user@example.org:secret'),
      );
    });

    it('is not connected when the server refuses or answers nothing', async () => {
      answer = () => json({ error: 'unauthorized' }, 401);
      expect(await service.checkConnection()).toBeFalse();

      answer = () => json('', 200);
      expect(await service.checkConnection()).toBeFalse();

      answer = () => json({ id: 7 }, 201);
      expect(await service.checkConnection()).toBeFalse();

      // Only the status: the answer and its headers stay out of the app log.
      expect(log.error.calls.allArgs()).toEqual([
        ['Visualizer connection check did not return data, status:', 401],
        ['Visualizer connection check did not return data, status:', 200],
        ['Visualizer connection check did not return data, status:', 201],
      ]);
    });

    it('is not connected when the server cannot be reached', async () => {
      answer = () => Promise.reject(new TypeError('Failed to fetch'));

      expect(await service.checkConnection()).toBeFalse();
      expect(log.error.calls.allArgs()).toEqual([
        ['Visualizer connection check errored:', 'TypeError'],
      ]);
    });

    it('keeps the answer of the server, the account, out of the app log', async () => {
      answer = () => json({ id: 7, email: 'user@example.org' });

      await service.checkConnection();

      expect(log.info.calls.allArgs()).toEqual([
        ['Visualizer connection check successful'],
      ]);
    });
  });
});
