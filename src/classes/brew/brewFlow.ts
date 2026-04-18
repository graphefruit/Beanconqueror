export class BrewFlow {
  public weight: Array<IBrewWeightFlow>;
  public weightSecond: Array<IBrewWeightFlow>;
  public waterFlow: Array<IBrewWaterFlow>;
  public realtimeFlow: Array<IBrewRealtimeWaterFlow>;
  public realtimeFlowSecond: Array<IBrewRealtimeWaterFlow>;
  public pressureFlow: Array<IBrewPressureFlow>;
  public temperatureFlow: Array<IBrewTemperatureFlow>;
  public waterDispensed: Array<IBrewWaterDispensedFlow>;
  public waterDispensedFlowSecond: Array<IBrewWaterDispensedFlow>;
  public brewbyweight: Array<IBrewByWeight>;
  public customMetrics: { [key: string]: Array<IBrewCustomMetric> };
  public customAxes: Array<IBrewCustomAxis>;

  constructor() {
    this.weight = [];
    this.weightSecond = [];
    this.waterFlow = [];
    this.realtimeFlow = [];
    this.realtimeFlowSecond = [];
    this.pressureFlow = [];
    this.temperatureFlow = [];
    this.waterDispensed = [];
    this.waterDispensedFlowSecond = [];
    this.brewbyweight = [];
    this.customMetrics = {};
    this.customAxes = [];
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
  not_mutated_weight: number;
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

export interface IBrewWaterDispensedFlow {
  actual: number;
  old: number;
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

export interface IBrewCustomMetric {
  value: number;
  timestamp: string;
  brew_time: string;
}

export interface IBrewCustomAxis {
  key: string; // Matches the key in customMetrics[] e.g. "waterDispensed"
  name: string; // Translated string or direct name e.g. "Counter Vol"
  unit: string; // Unit e.g. "ml"
  colorLight: string; // Hex color for light mode e.g. "#000000"
  colorDark: string; // Hex color for dark mode e.g. "#ffffff"
  yAxisRangeMin?: number; // e.g. 0
  yAxisRangeMax?: number; // e.g. 100
  hiddenDefault?: boolean; // If true, graph chip is outlined (not visible) initially
}
