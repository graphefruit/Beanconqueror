export interface RoastData {
  metadata: RoastMetadata;
  timeSeries: TimePoint[];
}

export interface RoastMetadata {
  [key: string]: any;
}

export interface KaffelogicMetadata extends RoastMetadata {
  log_file_name: string;
  profile_file_name: string;
  profile_short_name: string;
  profile_designer: string;
  profile_modified: string;
  profile_schema_version: string;
  native_schema_version: string;
  roasting_level: number;
  boost_load_size: number;
  boost_load_fan_multiplier: number;
  boost_load_power_multiplier: number;
  time_jump: number;
  preheat_heater_percent: number;
  ambient_temperature: number;
  mains_voltage: string;
  heater_power_available: number;
  power_factor: number;
  density_factor: number;
  reference_temperature: number;
  back2back_count: number;
  model: string;
  motor_hours: number;
  heater_hours: number;
  calibration_data: string;
  firmware_version: string;
  emulation_mode: number;
  recommended_level: number;
  expect_fc: number;
  expect_colrchange: number;
  reference_load_size: number;
  preheat_power: number;
  preheat_nominal_temperature: number;
  preheat_min_power_offset: number;
  preheat_min_time: number;
  preheat_max_time: number;
  preheat_check_gradient_time: number;
  preheat_target_in_future: number;
  preheat_mode: number;
  preheat_end_detection_count: number;
  preheat_temperature_proximity: number;
  roast_required_power: number;
  roast_min_desired_rate_of_rise: number;
  roast_target_in_future: number;
  roast_use_prediction_method: number;
  roast_target_timeshift: number;
  roast_end_by_time_ratio: number;
  roast_PID_Kp: number;
  roast_PID_Ki: number;
  roast_PID_Kd: number;
  roast_PID_min_i: number;
  roast_PID_max_i: number;
  roast_PID_iLimitApplyAtZero: number;
  roast_PID_differentialOnError: number;
  specific_heat_adj_upper_temperature_limit: number;
  specific_heat_adj_lower_temperature_limit: number;
  specific_heat_adj_multiplier_Kp: number;
  specific_heat_adj_multiplier_Kd: number;
  zone1_time_start: number;
  zone1_time_end: number;
  zone1_multiplier_Kp: number;
  zone1_multiplier_Kd: number;
  zone1_boost: number;
  zone2_time_start: number;
  zone2_time_end: number;
  zone2_multiplier_Kp: number;
  zone2_multiplier_Kd: number;
  zone2_boost: number;
  zone3_time_start: number;
  zone3_time_end: number;
  zone3_multiplier_Kp: number;
  zone3_multiplier_Kd: number;
  zone3_boost: number;
  corner1_time_start: number;
  corner1_time_end: number;
  cooldown_hi_speed: number;
  cooldown_lo_speed: number;
  cooldown_lo_temperature: number;
  roast_levels: string;
  roast_profile: string;
  fan_profile: string;
  offsets: string;
}

export interface TimePoint {
  time: number;
  spot_temp: number;
  temp: number;
  mean_temp: number;
  profile: number;
  profile_ROR: number;
  actual_ROR: number;
  desired_ROR: number;
  power_kW: number;
  volts: number;
  Kp: number;
  Ki: number;
  Kd: number;
  actual_fan_RPM: number;
}
