import { IGraph } from '../../interfaces/graph/iGraph';
import { Config } from '../objectConfig/objectConfig';

export class Graph implements IGraph {
  public name: string;
  public note: string;
  public flow_profile: string;
  public config: Config;
  public finished: boolean;

  constructor() {
    this.name = '';
    this.note = '';
    this.flow_profile = '';
    this.config = new Config();
    this.finished = false;
  }

  public initializeByObject(graphObj: IGraph): void {
    Object.assign(this, graphObj);
  }
  public getGraphPath() {
    const savingPath = 'graphs/' + this.config.uuid + '_flow_profile.json';
    return savingPath;
  }
}
