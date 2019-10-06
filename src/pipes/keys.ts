/** Core */
import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: 'keys'})
export class KeysPipe implements PipeTransform {
  public transform(value, args?: Array<string>): any {

    const keys = [];
    for (const key in value) {

      keys.push(key);
    }

    return keys;
  }
}
