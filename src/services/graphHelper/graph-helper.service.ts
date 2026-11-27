import { inject, Service } from '@angular/core';

import { Platform } from '@ionic/angular';

import { TranslateService } from '@ngx-translate/core';

import { Brew } from '../../classes/brew/brew';
import { BrewFlow } from '../../classes/brew/brewFlow';
import { FlowSeriesBuffer } from '../../components/brews/graph/flow-series-buffer';
import {
  initiallyVisible,
  seriesDefsFor,
} from '../../components/brews/graph/series-def';
import { UplotRenderer } from '../../components/brews/graph/uplot-renderer';
import { UIFileHelper } from '../uiFileHelper';
import { UISettingsStorage } from '../uiSettingsStorage';
import { readableLine } from './line-contrast';

/** Bitmap pixels per CSS pixel of a picture of the graph, sharp on any screen. */
const IMAGE_SCALE = 3;

@Service()
export class GraphHelperService {
  private readonly translate = inject(TranslateService);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly platform = inject(Platform);
  private readonly uiFileHelper = inject(UIFileHelper);

  /**
   * The graph of a brew as a PNG data URL, drawn off screen at a fixed size
   * and three times as sharp; undefined when the brew has none. Callers only
   * get the picture, so the renderer behind it can change without them. It
   * is drawn light or dark as asked, not as the app is, with the axes in
   * `ink` and a clear ground, so it takes the colour of whatever it is laid
   * on. Lines too faint on `ground` are darkened (or lightened) to 3:1; the
   * app's own graph keeps the colours as they were chosen.
   */
  public async brewGraphImage(
    brew: Pick<Brew, 'flow_profile'>,
    width: number,
    height: number,
    look: {
      readonly dark: boolean;
      readonly ink: string;
      readonly ground: string;
    },
  ): Promise<string | undefined> {
    if (!brew.flow_profile) {
      return undefined;
    }
    const buffer = new FlowSeriesBuffer();
    if (!buffer.load(await this.readFlowProfile(brew.flow_profile)).hasGraph) {
      return undefined;
    }
    const settings = this.uiSettingsStorage.getSettings();
    const defs = seriesDefsFor(buffer, 'live', settings.graph_colors, (key) =>
      String(this.translate.instant(key)),
    ).map((def) => ({
      ...def,
      colour: {
        light: readableLine(def.colour.light, look.ground),
        dark: readableLine(def.colour.dark, look.ground),
      },
    }));
    const renderer = new UplotRenderer();
    try {
      await renderer.mount(document.createElement('div'), {
        width,
        height,
        dark: look.dark,
        mode: 'static',
        axisSettings: settings,
      });
      renderer.setSeries(defs);
      renderer.attach(buffer);
      for (const def of defs) {
        renderer.setVisible(def.id, initiallyVisible(def, null));
      }
      return await renderer.exportImage({
        width,
        height,
        theme: look.dark ? 'dark' : 'light',
        ink: look.ink,
        transparent: true,
        compact: true,
        scale: IMAGE_SCALE,
      });
    } finally {
      renderer.destroy();
    }
  }

  /**
   * The graph file of a brew. The browser has no files, so a sample stands in
   * there, as on the brew card.
   */
  public async readFlowProfile(path: string): Promise<BrewFlow> {
    if (!this.platform.is('capacitor')) {
      return (await import('../../assets/BeanconquerorFlowTestDataFourth.json'))
        .default as unknown as BrewFlow;
    }
    return (await this.uiFileHelper.readInternalJSONFile(path)) as BrewFlow;
  }
}
