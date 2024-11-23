/** Core */
import { Pipe, PipeTransform } from '@angular/core';

import { Settings } from '../../classes/settings/settings';
import { SETTING_FUNCTION_PIPE_ENUM } from '../../enums/settings/settingFunctionPipe';

@Pipe({ name: 'settingFunctionPipe' })
export class SettingFunction implements PipeTransform {
  public transform(
    value: Settings,
    arg: SETTING_FUNCTION_PIPE_ENUM | Array<SETTING_FUNCTION_PIPE_ENUM | any>,
  ): any {
    try {
      let action;
      if (typeof arg !== 'object') {
        action = arg;
      } else {
        action = arg[0];
      }
      switch (action) {
        case SETTING_FUNCTION_PIPE_ENUM.SHOW_ROASTING_SECTION:
          return value.show_roasting_section;
        case SETTING_FUNCTION_PIPE_ENUM.SHOW_WATER_SECTION:
          return value.show_water_section;
        case SETTING_FUNCTION_PIPE_ENUM.SHOW_GRAPH_SECTION:
          return value.show_graph_section;
      }
    } catch (ex) {}
  }
}
