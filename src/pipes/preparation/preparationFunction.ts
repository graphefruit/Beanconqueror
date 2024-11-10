/** Core */
import { Pipe, PipeTransform } from '@angular/core';

import { PREPARATION_FUNCTION_PIPE_ENUM } from '../../enums/preparations/preparationFunctionPipe';
import { Preparation } from '../../classes/preparation/preparation';

@Pipe({ name: 'preparationFunctionPipe' })
export class PreparationFunction implements PipeTransform {
  public transform(
    value: Preparation,
    arg:
      | PREPARATION_FUNCTION_PIPE_ENUM
      | Array<PREPARATION_FUNCTION_PIPE_ENUM | any>
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
