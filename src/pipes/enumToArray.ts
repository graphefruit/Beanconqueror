/** Core */
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'enumToArray',
  standalone: false,
})
export class EnumToArrayPipe implements PipeTransform {
  public transform(value): object {
    const keys = Object.keys(value);

    return keys;
  }
}
