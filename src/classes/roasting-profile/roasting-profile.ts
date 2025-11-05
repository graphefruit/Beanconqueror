import { IRoastingProfile } from '../../interfaces/roasting-profile/iRoastingProfile';

export class RoastingProfile implements IRoastingProfile {
  public time: number[];
  public temperature: number[];
  public power: number[];
  public fan: number[];

  constructor() {
    this.time = [];
    this.temperature = [];
    this.power = [];
    this.fan = [];
  }
}
