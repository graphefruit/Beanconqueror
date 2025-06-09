import { SanremoYOUMode } from '../../../enums/preparationDevice/sanremo/sanremoYOUMode';

export interface ISanremoYOUParams {
  stopAtWeight: number;
  residualLagTime: number;
  selectedMode: SanremoYOUMode;

  stopAtWeightP1: number;
  stopAtWeightP2: number;
  stopAtWeightP3: number;
  stopAtWeightM: number;
}
