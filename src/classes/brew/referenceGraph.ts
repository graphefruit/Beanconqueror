import { IReferenceGraph } from '../../interfaces/brew/iReferenceGraph';
import { REFERENCE_GRAPH_TYPE } from '../../enums/brews/referenceGraphType';

export class ReferenceGraph implements IReferenceGraph {
  public type: REFERENCE_GRAPH_TYPE;
  public uuid: string;

  constructor() {
    this.type = REFERENCE_GRAPH_TYPE.NONE;
    this.uuid = '';
  }
}
