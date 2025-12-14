import { SanremoYOUMode } from '../../../enums/preparationDevice/sanremo/sanremoYOUMode';

export interface ISanremoYOUParams {
  stopAtWeight: number;
  residualLagTime: number;
  selectedMode: SanremoYOUMode;

  stopAtWeightP1: number;
  stopAtWeightP2: number;
  stopAtWeightP3: number;
  stopAtWeightM: number;

  residualLagTimeP1: number;
  residualLagTimeP2: number;
  residualLagTimeP3: number;
  residualLagTimeM: number;
}
