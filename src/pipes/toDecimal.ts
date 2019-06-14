/** Core */
import {Pipe, PipeTransform} from '@angular/core';

/** Third party */
@Pipe({name: 'toDecimal'})
export class ToDecimalPipe implements PipeTransform {
  public transform(value, args?: Array<string>): any {
    // SAMPLE - http://jsfiddle.net/kunycrkb/

    return parseFloat(value);
  }
}
