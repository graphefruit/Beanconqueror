import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'beanFieldVisiblePipe' })
export class BeanFieldVisiblePipe implements PipeTransform {
  public transform(value, args?: Array<boolean>): any {
    const _settingsField: boolean = args[0];
    if (_settingsField === true) {
      return true;
    }
    return false;
  }
}
