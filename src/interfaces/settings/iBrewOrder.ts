/** Interfaces */

export interface IBrewOrder {
  // Properties
  brew_time: number;
  brew_temperature_time: number;
  grind_size: number;
  grind_weight: number;
  mill: number;
  mill_speed: number;
  mill_timer: number;
  pressure_profile: number;
  method_of_preparation: number;
  brew_quantity: number;
  bean_type: number;
  brew_temperature: number;
  note: number;
  attachments: number;
  rating: number;
  coffee_type: number;
  coffee_concentration: number;
  coffee_first_drip_time: number;
  coffee_blooming_time: number;
  set_last_coffee_brew: number;
  set_custom_brew_time: number;

  getLabel(string): string;
}
