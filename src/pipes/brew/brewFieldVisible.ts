/** Core */
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'brewFieldVisiblePipe' })
export class BrewFieldVisiblePipe implements PipeTransform {
  public transform(value, args?: Array<boolean>): any {
    const _settingsField: boolean = args[0];
    const _preparationField: boolean = args[1];
    const _useCustomPreparation: boolean = args[2];
    return _useCustomPreparation ? _preparationField : _settingsField;
  }
}
