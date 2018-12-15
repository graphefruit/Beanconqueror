/**Core**/
import {Pipe, PipeTransform} from '@angular/core';
/**Third party**/
import moment from 'moment';
@Pipe({name: 'formatDate'})
export class FormatDatePipe implements PipeTransform {
  transform(value, format, args?: string[]): any {
    //SAMPLE - http://jsfiddle.net/kunycrkb/
    let m;
    if (typeof(value) ==="number")
    {
       m = moment.unix(value);
    }
    else
    {
      m = moment(value);
    }

    if (format != undefined) {
      return m.format(format[0]).toString();
    }
    else {

      return m.format("llll").toString();
    }
  }
}
