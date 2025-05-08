export interface ISanremoShotData {
  status: number;
  description: string;
  groupStatus: number;
  statusPhase: number;
  alarms: number;
  warnings: number;
  tempBoilerCoffe: number;
  tempBolierService: number;
  pumpServicesPress: number;
  pumpPress: number;
  counterVol: number;
  realtimeFlow: number;
  setPressPaddle: number;
  localTimeString: string;
}
