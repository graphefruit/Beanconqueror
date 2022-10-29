
export class BrewFlow {
  public weight: Array<IBrewWeightFlow>;
  public waterFlow: Array<IBrewWaterFlow>;
  public realtimeFlow: Array<IBrewRealtimeWaterFlow>;
  public pressureFlow: Array<IBrewPressureFlow>;

  constructor() {
    this.weight = [];
    this.waterFlow = [];
    this.realtimeFlow = [];
    this.pressureFlow = [];
  }

}

export interface IBrewWeightFlow {

  timestamp: string;
  brew_time: string;
  actual_weight: number;
  old_weight: number;
  actual_smoothed_weight: number;
  old_smoothed_weight: number;
  calculated_real_flow: number;

}
export interface IBrewWaterFlow {
  value: number;
  brew_time: string;
  timestamp: string;

}
export interface IBrewRealtimeWaterFlow {
  flow_value: number;
  brew_time: string;
  timestamp: string;
  smoothed_weight: number;
}

export interface IBrewRealtimeWaterFlow {
  flow_value: number;
  brew_time: string;
  timestamp: string;
  smoothed_weight: number;
}
export interface IBrewPressureFlow {
  actual_pressure: number;
  old_pressure: number;
  brew_time: string;
  timestamp: string;
}
