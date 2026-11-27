import { TestBed } from '@angular/core/testing';

import { Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';

import { BrewFlow } from '../../../classes/brew/brewFlow';
import { Settings } from '../../../classes/settings/settings';
import type { SeriesDef } from '../../../components/brews/graph/series-def';
import { UplotRenderer } from '../../../components/brews/graph/uplot-renderer';
import { UIFileHelper } from '../../uiFileHelper';
import { UISettingsStorage } from '../../uiSettingsStorage';
import { GraphHelperService } from '../graph-helper.service';
import { contrastRatio } from '../line-contrast';

const LIGHT = { dark: false, ink: '#4a382c', ground: '#fbfaf6' };
const DARK = { dark: true, ink: '#e1d1bf', ground: '#2a211a' };

/** Weight and realtime flow for two seconds, and an imported metric. */
function pictureFlow(): BrewFlow {
  const flow = new BrewFlow();
  flow.weight = [0, 1, 2].map((s) => ({
    actual_weight: s * 10,
    old_weight: 0,
    actual_smoothed_weight: 0,
    old_smoothed_weight: 0,
    calculated_real_flow: 0,
    not_mutated_weight: 0,
    timestamp: `00:00:0${s}.000`,
    brew_time: `${s}.000`,
  }));
  flow.realtimeFlow = [0, 1, 2].map((s) => ({
    flow_value: s,
    smoothed_weight: 0,
    timestampdelta: 0,
    timestamp: `00:00:0${s}.000`,
    brew_time: `${s}.000`,
  }));
  flow.customMetrics.extra = [
    { value: 4, timestamp: '00:00:01.000', brew_time: '1.000' },
  ];
  return flow;
}

describe('GraphHelperService graph picture', () => {
  let service: GraphHelperService;
  let platform: jasmine.SpyObj<Platform>;
  let files: Record<'readInternalJSONFile', jasmine.Spy>;

  beforeEach(() => {
    service = buildService();
    platform = TestBed.inject(Platform) as jasmine.SpyObj<Platform>;
    platform.is.and.returnValue(true);
    files = TestBed.inject(UIFileHelper) as unknown as typeof files;
  });

  describe('through the chart port', () => {
    let mount: jasmine.Spy;
    let setSeries: jasmine.Spy;
    let setVisible: jasmine.Spy;
    let exportImage: jasmine.Spy;
    let destroy: jasmine.Spy;

    beforeEach(() => {
      const port = UplotRenderer.prototype;
      mount = spyOn(port, 'mount').and.resolveTo();
      setSeries = spyOn(port, 'setSeries');
      spyOn(port, 'attach');
      setVisible = spyOn(port, 'setVisible');
      exportImage = spyOn(port, 'exportImage').and.resolveTo(
        'data:image/png;x',
      );
      destroy = spyOn(port, 'destroy');
    });

    function drawnDefs(): SeriesDef[] {
      return setSeries.calls.mostRecent().args[0] as SeriesDef[];
    }

    it('has no picture for a brew without graph and reads nothing', async () => {
      expect(
        await service.brewGraphImage({ flow_profile: '' }, 300, 150, LIGHT),
      ).toBe(undefined);
      expect(files.readInternalJSONFile).not.toHaveBeenCalled();
      expect(mount).not.toHaveBeenCalled();
    });

    it('has no picture for a graph file without samples', async () => {
      files.readInternalJSONFile.and.resolveTo(new BrewFlow());

      expect(
        await service.brewGraphImage(
          { flow_profile: 'b.json' },
          300,
          150,
          LIGHT,
        ),
      ).toBe(undefined);
      expect(exportImage).not.toHaveBeenCalled();
    });

    it('draws the graph file of a brew off screen at the size asked for, three times as sharp', async () => {
      files.readInternalJSONFile.and.resolveTo(pictureFlow());

      const image = await service.brewGraphImage(
        { flow_profile: 'brews/1_flow_profile.json' },
        300,
        150,
        LIGHT,
      );

      expect(image).toBe('data:image/png;x');
      expect(files.readInternalJSONFile).toHaveBeenCalledWith(
        'brews/1_flow_profile.json',
      );
      const [host, options] = mount.calls.mostRecent().args;
      expect((host as HTMLElement).isConnected).toBeFalse();
      expect(options).toEqual(
        jasmine.objectContaining({
          width: 300,
          height: 150,
          dark: false,
          mode: 'static',
        }),
      );
      expect(exportImage).toHaveBeenCalledOnceWith({
        width: 300,
        height: 150,
        theme: 'light',
        ink: '#4a382c',
        transparent: true,
        compact: true,
        scale: 3,
      });
      expect(drawnDefs().map((d) => d.id)).toEqual([
        'weight',
        'realtimeFlow',
        'custom:extra',
      ]);
      expect(destroy).toHaveBeenCalledTimes(1);
    });

    it('draws dark when asked, in a light app, with every line readable on the ground', async () => {
      files.readInternalJSONFile.and.resolveTo(pictureFlow());
      const colors = new Settings().graph_colors;

      await service.brewGraphImage({ flow_profile: 'b.json' }, 300, 150, DARK);

      expect(exportImage.calls.mostRecent().args[0]).toEqual(
        jasmine.objectContaining({ theme: 'dark', ink: '#e1d1bf' }),
      );
      const [weight, realtime] = drawnDefs();
      expect(weight.colour.dark).toBe(colors.weight.active.dark);
      // Too dark on the dark card, so lightened; the app's own colour stays.
      expect(colors.realtimeFlow.active.dark).toBe('#09485D');
      expect(realtime.colour.dark).not.toBe('#09485D');
      for (const def of drawnDefs()) {
        expect(contrastRatio(def.colour.dark, DARK.ground))
          .withContext(def.id)
          .toBeGreaterThanOrEqual(3);
      }

      await service.brewGraphImage({ flow_profile: 'b.json' }, 300, 150, LIGHT);
      expect(drawnDefs()[0].colour.light).not.toBe(colors.weight.active.light);
      for (const def of drawnDefs()) {
        expect(contrastRatio(def.colour.light, LIGHT.ground))
          .withContext(def.id)
          .toBeGreaterThanOrEqual(3);
      }
    });

    it('leaves an imported axis out that asks to start hidden', async () => {
      const flow = pictureFlow();
      flow.customAxes = [
        {
          key: 'extra',
          name: 'Extra',
          unit: 'x',
          colorLight: '#000000',
          colorDark: '#ffffff',
          hiddenDefault: true,
        },
      ];
      files.readInternalJSONFile.and.resolveTo(flow);

      await service.brewGraphImage({ flow_profile: 'b.json' }, 300, 150, LIGHT);

      expect(setVisible).toHaveBeenCalledWith('custom:extra', false);
      expect(setVisible).toHaveBeenCalledWith('weight', true);
    });

    it('passes on a graph file that cannot be read', async () => {
      files.readInternalJSONFile.and.rejectWith(new Error('gone'));

      await expectAsync(
        service.brewGraphImage(
          { flow_profile: 'brews/1.json' },
          300,
          150,
          LIGHT,
        ),
      ).toBeRejectedWithError('gone');
      expect(mount).not.toHaveBeenCalled();
    });

    it('passes on a failed drawing and lets go of the chart', async () => {
      files.readInternalJSONFile.and.resolveTo(pictureFlow());
      exportImage.and.rejectWith(new Error('no canvas'));

      await expectAsync(
        service.brewGraphImage({ flow_profile: 'b.json' }, 300, 150, LIGHT),
      ).toBeRejectedWithError('no canvas');
      expect(destroy).toHaveBeenCalledTimes(1);
    });
  });

  it('draws a clear PNG three times the size asked for', async () => {
    files.readInternalJSONFile.and.resolveTo(pictureFlow());

    const url = await service.brewGraphImage(
      { flow_profile: 'b.json' },
      300,
      150,
      LIGHT,
    );

    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    expect(image.width).toBe(900);
    expect(image.height).toBe(450);
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    expect(ctx.getImageData(1, 1, 1, 1).data[3]).toBe(0);
    const alpha = ctx
      .getImageData(0, 0, 900, 450)
      .data.filter((_v, i) => i % 4 === 3);
    expect(alpha.some((a) => a > 0)).toBeTrue();
    expect(document.querySelectorAll('.uplot').length).toBe(0);
  });

  it('draws a sample in the browser, which has no files', async () => {
    platform.is.and.returnValue(false);

    const flow = await service.readFlowProfile('brews/1.json');

    expect(flow.weight.length).toBeGreaterThan(0);
    expect(files.readInternalJSONFile).not.toHaveBeenCalled();
  });
});

function buildService(): GraphHelperService {
  const translate = jasmine.createSpyObj('TranslateService', ['instant']);
  translate.instant.and.callFake((key: string | undefined) => {
    if (key === 'BREW_IMPORT_METRIC_TARGET') {
      return 'Target';
    }
    return String(key);
  });

  TestBed.configureTestingModule({
    providers: [
      GraphHelperService,
      {
        provide: TranslateService,
        useValue: translate,
      },
      {
        provide: UISettingsStorage,
        useValue: jasmine.createSpyObj('UISettingsStorage', {
          getSettings: new Settings(),
        }),
      },
      {
        provide: Platform,
        useValue: jasmine.createSpyObj('Platform', ['is']),
      },
      {
        provide: UIFileHelper,
        useValue: jasmine.createSpyObj('UIFileHelper', [
          'readInternalJSONFile',
        ]),
      },
    ],
  });

  return TestBed.inject(GraphHelperService);
}
