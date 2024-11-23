/** Core */
import { Pipe, PipeTransform } from '@angular/core';

import { PREPARATION_FUNCTION_PIPE_ENUM } from '../../enums/preparations/preparationFunctionPipe';
import { MILL_FUNCTION_PIPE_ENUM } from '../../enums/mills/millFunctionPipe';
import { Mill } from '../../classes/mill/mill';

@Pipe({
    name: 'millFunctionPipe',
    standalone: false
})
export class MillFunction implements PipeTransform {
  public transform(
    value: Mill,
    arg: MILL_FUNCTION_PIPE_ENUM | Array<MILL_FUNCTION_PIPE_ENUM | any>,
  ): any {
    try {
      let action;
      if (typeof arg !== 'object') {
        action = arg;
      } else {
        action = arg[0];
      }
      switch (action) {
        case PREPARATION_FUNCTION_PIPE_ENUM.HAS_PHOTOS:
          return value.hasPhotos();
      }
    } catch (ex) {}
  }
}
