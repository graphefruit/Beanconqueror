/** Interfaces */

export interface IOrderBrewParameter {
  // Properties
  before: {
    grind_size: number;
    grind_weight: number;
    brew_temperature: number;
    method_of_preparation: number;
    bean_type: number;
    mill: number;
    mill_speed: number;
    mill_timer: number;
    pressure_profile: number;
  };

  while: {
    brew_temperature_time: number;
    brew_time: number;
    coffee_blooming_time: number;
    coffee_first_drip_time: number;

  };

  after: {
    brew_quantity: number;
    coffee_type: number;
    coffee_concentration: number;
    rating: number;
    note: number;
    set_custom_brew_time: number;
    attachments: number;
    tds:number;
    brew_beverage_quantity:number;
  };



  getLabel(string): string;
}
