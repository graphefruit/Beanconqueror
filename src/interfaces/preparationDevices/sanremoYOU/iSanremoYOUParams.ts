import { SanremoYOUMode } from '../../../enums/preparationDevice/sanremo/sanremoYOUMode';

export interface ISanremoYOUParams {
  stopAtWeight: number;
  residualLagTime: number;
  selectedMode: SanremoYOUMode;
}
