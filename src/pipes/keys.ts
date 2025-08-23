/** Core */
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'keys',
  standalone: false,
})
export class KeysPipe implements PipeTransform {
  public transform(value, args?: Array<string>): any {
    const keys = [];
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        keys.push(key);
      }
    }

    return keys;
  }
}
