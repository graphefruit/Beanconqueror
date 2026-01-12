import {IPreparationTool} from '../../interfaces/preparation/iPreparationTool';
import {Config} from '../objectConfig/objectConfig';


export class PreparationTool implements IPreparationTool {
  public name: string;
  public config: Config;
  public archived: boolean;

  constructor() {
    this.name = '';

    this.config = new Config();

    this.archived = false;

  }

}
