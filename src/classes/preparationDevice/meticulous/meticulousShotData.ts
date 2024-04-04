import { IMeticulousShotData } from '../../../interfaces/preparationDevices/meticulous/iMeticulousShotData';

export class MeticulousShotData implements IMeticulousShotData {
  public status: string;
  public shotTime: number;
  public pressure: number;
  public flow: number;
  public weight: number;
  public temperature: number;
  constructor() {
    this.status = '';
    this.shotTime = 0;
    this.pressure = 0;
    this.flow = 0;
    this.weight = 0;
    this.temperature = 0;
  }
}
