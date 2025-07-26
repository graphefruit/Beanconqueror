/** Core */
import { Pipe, PipeTransform } from '@angular/core';
/** Third party */
import moment from 'moment';

@Pipe({
  name: 'formatDate',
  standalone: false,
})
export class FormatDatePipe implements PipeTransform {
  public transform(value, format, args?: Array<string>): any {
    // SAMPLE - http://jsfiddle.net/kunycrkb/
    try {
      if (value === null || value === undefined || value === '') {
        return '';
      }
      let m: any;

      m = typeof value === 'number' ? moment.unix(value) : moment(value);

      if (format !== undefined) {
        return m.format(format[0]).toString();
      }

      return m.format('llll').toString();
    } catch (ex) {
      return '';
    }
  }
}
