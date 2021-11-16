
export class BrewFlow {
  public weight: Array<IBrewWeightFlow>;
  public waterFlow: Array<IBrewWaterFlow>;

  constructor() {
    this.weight = [];
    this.waterFlow = [];

  }
}

export interface IBrewWeightFlow {

  timestamp: string;
  brew_time: string;
  actual_weight: number;
  old_weight: number;
  actual_smoothed_weight: number;
  old_smoothed_weight: number;

}
export interface IBrewWaterFlow {
  value: number;
  brew_time: string;
  timestamp: string;

}
