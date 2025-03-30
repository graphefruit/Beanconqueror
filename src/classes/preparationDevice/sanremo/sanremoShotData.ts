import { ISanremoShotData } from '../../../interfaces/preparationDevices/sanremoYOU/iSanremoShotData';

export class SanremoShotData implements ISanremoShotData {
  public status: number;
  public description: string;
  public groupStatus: number;
  public statusPhase: number;
  public alarms: number;
  public warnings: number;
  public tempBoilerCoffe: number;
  public tempBolierService: number;
  public pumpServicesPress: number;
  public pumpPress: number;
  public counterVol: number;
  public realtimeFlow: number;
  public setPressPaddle: number;

  constructor() {
    this.status = 0;
    this.description = 'OFF';
    this.groupStatus = 0;
    this.statusPhase = 0;
    this.alarms = 0;
    this.warnings = 0;
    this.tempBoilerCoffe = 0;
    this.tempBolierService = 0;
    this.pumpServicesPress = 0;
    this.pumpPress = 0;
    this.counterVol = 0;
    this.realtimeFlow = 0;
    this.setPressPaddle = 0;
  }
}
