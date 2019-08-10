/** Core */
import {Pipe, PipeTransform} from '@angular/core';
/** Third party */
import * as moment from 'moment';

@Pipe({name: 'formatDate'})
export class FormatDatePipe implements PipeTransform {
  public transform(value, format, args?: Array<string>): any {
    // SAMPLE - http://jsfiddle.net/kunycrkb/
    let m: any;

    m = typeof(value) === 'number' ? moment.unix(value) : moment(value);

    if (format !== undefined) {
      return m.format(format[0]).toString();
    }

    return m.format('llll').toString();
  }
}
