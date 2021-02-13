export interface IBeanRoastInformation {
  /* On which temperature where the beans removed from the roaster **/
  drop_temperature: number;

  /* Roasting length **/
  roast_length: number;

  /* Roasting machine **/
  roaster_machine: string;

  /* The used green beans weight*/
  green_bean_weight:number;

  outside_temperature:number;

  humidity:number;

  /* Inherits the bean unique id, without this id, the roast information won't be displayed **/
  bean_uuid: string;

  /* Inherits the first crack minute **/
  first_crack_minute: number;
  /* Inherits the first crack temperature **/
  first_crack_temperature: number;
  /* Inherits the second crack minute **/
  second_crack_minute: number;
  /* Inherits the second crack temperatuer **/
  second_crack_temperature: number;
}
