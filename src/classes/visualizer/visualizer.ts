import { IVisualizer } from '../../interfaces/visualizer/iVisualizer';
import { BrewVisualizer } from './brewVisualizer';
import { BeanVisualizer } from './beanVisualizer';
import { PreparationVisualizer } from './preparationVisualizer';
import { WaterVisualizer } from './waterVisualizer';
import { MillVisualizer } from './millVisualizer';
import { Brew } from '../brew/brew';
import { Bean } from '../bean/bean';
import { Mill } from '../mill/mill';
import { Preparation } from '../preparation/preparation';
import { Water } from '../water/water';
import { BrewFlow } from '../brew/brewFlow';

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

  public mapBrew(brew: Brew) {
    Object.keys(this.brew).map((_key) => {
      this.brew[_key] = brew[_key];
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
  }
  public mapWater(water: Water) {
    Object.keys(this.water).map((_key) => {
      this.water[_key] = water[_key];
    });
  }
}
