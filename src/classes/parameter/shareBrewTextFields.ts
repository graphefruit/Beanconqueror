/** The fields included when a brew is shared as plain text. */
export class ShareBrewTextFields {
  public bean_name = true;
  public bean_roaster = true;
  public bean_country = true;
  public bean_region = false;
  public bean_variety = true;
  public bean_processing = true;

  public method_of_preparation = true;
  public mill = true;
  public grind_size = true;
  public grind_weight = true;
  public brew_quantity = true;
  public brew_beverage_quantity = true;
  public brew_temperature = true;
  public brew_time = true;
  public tds = true;
  public extraction_yield = true;
  public rating = false;
  public note = false;
}
