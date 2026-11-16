import { PREPARATION_STYLE_TYPE } from '../../enums/preparations/preparationStyleTypes';

export interface IVisualizerPreparationTool {
  name: string;
}

export interface IPreparationVisualizer {
  name: string;
  style_type: PREPARATION_STYLE_TYPE;
  /**
   * Names of the preparation tools available on the parent preparation
   * (e.g. WDT tools, tampers, distributors). Included so downstream tools
   * such as visualizer.coffee can display the user's tooling context.
   */
  tools: IVisualizerPreparationTool[];
}
