/** Core */
import { Pipe, PipeTransform } from '@angular/core';

/** Third party */

@Pipe({
    name: 'toFixed',
    standalone: false
})
export class ToFixedPipe implements PipeTransform {
  public transform(value, format, args?: Array<string>): any {
    // SAMPLE - http://jsfiddle.net/kunycrkb/
    try {
      if (value === null || value === undefined || value === '') {
        return 0;
      }
      const parsedFloat = parseFloat(value);
      if (isNaN(parsedFloat)) {
        return 0;
      }

      let dp = 2;
      if (format === null || format === undefined || format === '') {
      } else {
        dp = format;
      }

      return +parsedFloat.toFixed(dp);
    } catch (ex) {
      return 0;
    }
  }
}
