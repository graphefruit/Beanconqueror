export class BrewFlow {
  public weight: Array<IBrewWeightFlow>;
  public waterFlow: Array<IBrewWaterFlow>;
  public realtimeFlow: Array<IBrewRealtimeWaterFlow>;
  public pressureFlow: Array<IBrewPressureFlow>;
  public temperatureFlow: Array<IBrewTemperatureFlow>;
  public brewbyweight: Array<IBrewByWeight>;

  constructor() {
    this.weight = [];
    this.waterFlow = [];
    this.realtimeFlow = [];
    this.pressureFlow = [];
    this.temperatureFlow = [];
    this.brewbyweight = [];
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
  timestampdelta: number;
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

export interface IBrewTemperatureFlow {
  actual_temperature: number;
  old_temperature: number;
  brew_time: string;
  timestamp: string;
}

export interface IBrewByWeight {
  target_weight: number;
  lag_time: number;
  brew_time: string;
  timestamp: string;
  last_flow_value: number;
  actual_scale_weight: number;

  calc_lag_time: number;
  calc_exceeds_weight: boolean;
  avg_flow_lag_residual_time: number;
  residual_lag_time: number;
  average_flow_rate: number;
  scaleType: string;
}
