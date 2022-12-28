import { PREPARATION_TYPES } from '../../enums/preparations/preparationTypes';
import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';

import { IPreparationVisualizer } from '../../interfaces/visualizer/iPreparationVisualizer';

export class PreparationVisualizer implements IPreparationVisualizer {
  public name: string;

  public style_type: PREPARATION_STYLE_TYPE;
  public type: PREPARATION_TYPES;

  constructor() {
    this.name = '';

    this.type = 'CUSTOM_PREPARATION' as PREPARATION_TYPES;
    this.style_type = undefined;
  }
}
