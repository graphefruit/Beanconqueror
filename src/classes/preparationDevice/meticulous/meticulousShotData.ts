import { IMeticulousShotData } from '../../../interfaces/preparationDevices/meticulous/iMeticulousShotData';

export class MeticulousShotData implements IMeticulousShotData {
  public status: string;
  public shotTime: number;
  public pressure: number;
  public flow: number;
  public weight: number;
  public temperature: number;

  public oldWeight: number;
  public smoothedWeight: number;
  public oldSmoothedWeight: number;
  constructor() {
    this.status = '';
    this.shotTime = 0;
    this.pressure = 0;
    this.flow = 0;
    this.weight = 0;
    this.temperature = 0;
    this.oldWeight = 0;
    this.smoothedWeight = 0;
    this.oldSmoothedWeight = 0;
  }

  protected calculateSmoothedWeight(
    _actualWeight: number,
    _smoothedWeight: number
  ): number {
    return _actualWeight * 0.3 + _smoothedWeight * 0.7;
  }
  public setWeight(_newWeight: number, _stableWeight: boolean = false) {
    // Allow negative weight
    // Each value effect the current weight bei 10%.
    // (A3 * 03 + b2 * 0.7)
    //  Actual value * 03 + smoothed value * 0.7

    this.oldSmoothedWeight = this.smoothedWeight;
    this.smoothedWeight = this.calculateSmoothedWeight(
      _newWeight,
      this.smoothedWeight
    );
    this.oldWeight = this.weight;
    // We passed every shake change, seems like everything correct, set the new weight.
    this.weight = _newWeight;
  }
}
