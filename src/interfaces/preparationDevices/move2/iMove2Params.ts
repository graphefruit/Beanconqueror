export interface IMove2Params {
  bluetoothId: string;
  bluetoothName: string;
  residualLagTime: number;
  stopAtWeight: number;
  remotePreinfusionEnable?: boolean;
  preinfusionPauseStart?: number;
  preinfusionPauseTime?: number;
}
