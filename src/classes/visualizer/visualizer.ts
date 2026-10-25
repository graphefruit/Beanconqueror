import { IVisualizer } from '../../interfaces/visualizer/iVisualizer';
import { Bean } from '../bean/bean';
import BaristamodeBrew from '../brew/baristamodeBrew';
import { Brew } from '../brew/brew';
import { BrewFlow } from '../brew/brewFlow';
import { Mill } from '../mill/mill';
import { Preparation } from '../preparation/preparation';
import { Water } from '../water/water';
import { BeanVisualizer } from './beanVisualizer';
import { BrewVisualizer } from './brewVisualizer';
import { MillVisualizer } from './millVisualizer';
import { PreparationVisualizer } from './preparationVisualizer';
import { WaterVisualizer } from './waterVisualizer';

export class Visualizer implements IVisualizer {
  public bean: BeanVisualizer;
  public brew: BrewVisualizer;
  public mill: MillVisualizer;
  public preparation: PreparationVisualizer;
  public water: WaterVisualizer;

  public brewFlow: BrewFlow;
  public application: string;
  public visualizerId: string;

  constructor() {
    this.application = 'BEANCONQUEROR';
    this.bean = new BeanVisualizer();
    this.brew = new BrewVisualizer();
    this.mill = new MillVisualizer();
    this.preparation = new PreparationVisualizer();
    this.water = new WaterVisualizer();
    this.brewFlow = new BrewFlow();
    this.visualizerId = '';
  }

  public mapBrew(brew: Brew | BaristamodeBrew) {
    Object.keys(this.brew).map((_key) => {
      if (brew.hasOwnProperty(_key)) {
        // We added this, because we have one key - the "EY" field, which is not existing on the normal brew one.
        this.brew[_key] = brew[_key];
      } else {
        // This should be the EY key ;)
      }
    });
  }
  public mapBean(bean: Bean) {
    Object.keys(this.bean).map((_key) => {
      this.bean[_key] = bean[_key];
    });
  }
  public mapMill(mill: Mill) {
    Object.keys(this.mill).map((_key) => {
      this.mill[_key] = mill[_key];
    });
  }
  public mapPreparation(preparation: Preparation) {
    Object.keys(this.preparation).map((_key) => {
      this.preparation[_key] = preparation[_key];
    });
    // Replace the copied tools array with a stripped-down view so the upload
    // payload only carries the fields downstream tools actually need
    // (name), instead of the internal PreparationTool objects with their
    // UUIDs, archived flags, etc.
    const rawTools = (preparation as any)?.tools;
    if (Array.isArray(rawTools)) {
      this.preparation.tools = rawTools
        .filter((t) => t && !t.archived)
        .map((t) => ({ name: t.name }));
    } else {
      this.preparation.tools = [];
    }
  }

  /**
   * Populate BrewVisualizer.used_preparation_tools with the names of the
   * preparation tools that were actually selected for this specific brew.
   * Beanconqueror stores the selection as UUIDs on the brew; this resolves
   * them against the preparation's tool catalog into human-readable names.
   */
  public mapUsedPreparationTools(
    brew: Brew | BaristamodeBrew,
    preparation: Preparation,
  ) {
    const selectedUuids = (brew as any)?.method_of_preparation_tools as
      | string[]
      | undefined;
    if (
      !selectedUuids ||
      !Array.isArray(selectedUuids) ||
      selectedUuids.length === 0 ||
      !Array.isArray((preparation as any)?.tools)
    ) {
      this.brew.used_preparation_tools = [];
      return;
    }
    const nameByUuid = new Map<string, string>();
    for (const tool of (preparation as any).tools) {
      if (tool?.config?.uuid) {
        nameByUuid.set(tool.config.uuid, tool.name);
      }
    }
    this.brew.used_preparation_tools = selectedUuids
      .map((uuid) => nameByUuid.get(uuid))
      .filter((name): name is string => !!name)
      .map((name) => ({ name }));
  }
  public mapWater(water: Water) {
    Object.keys(this.water).map((_key) => {
      this.water[_key] = water[_key];
    });
  }
}
