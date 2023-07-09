export interface IBrewPageFilter {
  // Properties
  mill: Array<string>;
  bean: Array<string>;
  method_of_preparation: Array<string>;
  method_of_preparation_tools: Array<string>;
  favourite: boolean;
  best_brew: boolean;
  chart_data: boolean;
  profiles: Array<string>;
  rating: {
    upper: number;
    lower: number;
  };
}
