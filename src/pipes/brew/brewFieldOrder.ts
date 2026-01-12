import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'brewFieldOrderPipe' })
export class BrewFieldOrder implements PipeTransform {
  public transform(value, args?: Array<any>): any {
    const _settingsOrder: number = args[0];
    const _preparationOrder: number = args[1];
    const _useCustomPreparation: boolean = args[2];
    return _useCustomPreparation ? _preparationOrder : _settingsOrder;
  }
}
