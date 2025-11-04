export class RoastingFlow {
  public temperature: Array<IRoastingTemperatureFlow>;
  public fan: Array<IRoastingFanFlow>;
  public heat: Array<IRoastingHeatFlow>;

  constructor() {
    this.temperature = [];
    this.fan = [];
    this.heat = [];
  }
}

export interface IRoastingTemperatureFlow {
  timestamp: string;
  roasting_time: string;
  actual_temperature: number;
}
export interface IRoastingFanFlow {
  value: number;
  roasting_time: string;
  timestamp: string;
}
export interface IRoastingHeatFlow {
  value: number;
  roasting_time: string;
  timestamp: string;
}
