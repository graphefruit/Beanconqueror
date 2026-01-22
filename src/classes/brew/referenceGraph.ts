import { REFERENCE_GRAPH_TYPE } from '../../enums/brews/referenceGraphType';
import { IReferenceGraph } from '../../interfaces/brew/iReferenceGraph';

export class ReferenceGraph implements IReferenceGraph {
  public type: REFERENCE_GRAPH_TYPE;
  public uuid: string;

  constructor() {
    this.type = REFERENCE_GRAPH_TYPE.NONE;
    this.uuid = '';
  }
}
