import { inject, Service } from '@angular/core';

import { Platform } from '@ionic/angular';

import type { BrewFlow } from '../../../classes/brew/brewFlow';
import { BREW_GRAPH_TYPE } from '../../../enums/brews/brewGraphType';
import { REFERENCE_GRAPH_TYPE } from '../../../enums/brews/referenceGraphType';
import type { IBrew } from '../../../interfaces/brew/iBrew';
import type { IReferenceGraph } from '../../../interfaces/brew/iReferenceGraph';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIFileHelper } from '../../../services/uiFileHelper';
import { UIGraphStorage } from '../../../services/uiGraphStorage.service';
import { UILog } from '../../../services/uiLog';

/** The reference graph of a brew; `missing` when it is set but cannot be read. */
export interface ReferenceFlow {
  flow: BrewFlow | null;
  missing: boolean;
}

/**
 * Reads the flow files a large graph shows. A missing or broken file reads as
 * null, so the graph shows a hint instead of failing. The browser has no
 * files and reads bundled samples instead.
 */
@Service()
export class FlowProfileReader {
  private readonly platform = inject(Platform);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiLog = inject(UILog);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiGraphStorage = inject(UIGraphStorage);

  public async read(path: string): Promise<BrewFlow | null> {
    if (!this.platform.is('capacitor')) {
      return (
        await import('../../../assets/BeanconquerorFlowTestDataFourth.json')
      ).default as unknown as BrewFlow;
    }
    if (!path) {
      return null;
    }
    try {
      return (await this.uiFileHelper.readInternalJSONFile(path)) as BrewFlow;
    } catch (error) {
      this.uiLog.error('Graph could not read the flow profile', error);
      return null;
    }
  }

  /** The reference graph the stored brew was made against. */
  public async readReference(brew: IBrew): Promise<ReferenceFlow> {
    if (!this.platform.is('capacitor')) {
      return {
        flow: (
          await import('../../../assets/BeanconquerorFlowTestDataSecond.json')
        ).default as unknown as BrewFlow,
        missing: false,
      };
    }
    const reference = this.uiBrewStorage.getEntryByUUID(
      brew.config.uuid,
    )?.reference_flow_profile;
    if (!reference || reference.type === REFERENCE_GRAPH_TYPE.NONE) {
      return { flow: null, missing: false };
    }
    const path = this.referencePath(reference);
    if (!path) {
      // The reference brew or graph has been deleted.
      return { flow: null, missing: true };
    }
    try {
      return {
        flow: (await this.uiFileHelper.readInternalJSONFile(path)) as BrewFlow,
        missing: false,
      };
    } catch (error) {
      this.uiLog.error('Graph could not read the reference', error);
      return { flow: null, missing: true };
    }
  }

  /** The file of a reference graph; undefined when its brew or graph has been deleted. */
  public referencePath(reference: IReferenceGraph): string | undefined {
    switch (reference.type) {
      case REFERENCE_GRAPH_TYPE.BREW:
        return this.uiBrewStorage
          .getEntryByUUID(reference.uuid)
          ?.getGraphPath(BREW_GRAPH_TYPE.BREW);
      case REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH:
        return this.uiBrewStorage
          .getEntryByUUID(reference.uuid)
          ?.getGraphPath(BREW_GRAPH_TYPE.IMPORTED_GRAPH);
      default:
        return this.uiGraphStorage
          .getEntryByUUID(reference.uuid)
          ?.getGraphPath();
    }
  }
}
