export interface IBrewPageFilter {
  // Properties
  mill: Array<string>;
  bean: Array<string>;
  method_of_preparation: Array<string>;
  method_of_preparation_tools: Array<string>;
  favourite: boolean;
  chart_data: boolean;
  rating: {
    upper: number;
    lower: number;
  };
}
