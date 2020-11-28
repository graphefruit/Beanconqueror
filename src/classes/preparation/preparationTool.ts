/** Interfaces */
import {IPreparationTool} from '../../interfaces/preparation/iPreparationTool';
/** Classes */
import {Config} from '../objectConfig/objectConfig';


export class PreparationTool implements IPreparationTool {
  public name: string;
  public config: Config;
  constructor() {
    this.name = '';

    this.config = new Config();

  }

}
