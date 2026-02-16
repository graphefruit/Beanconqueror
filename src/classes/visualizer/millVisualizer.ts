import { IMillVisualizer } from '../../interfaces/visualizer/iMillVisualizer';

export class MillVisualizer implements IMillVisualizer {
  public name: string;

  constructor() {
    this.name = '';
  }
}
