import { REFERENCE_GRAPH_TYPE } from '../../enums/brews/referenceGraphType';

export interface IReferenceGraph {
  type: REFERENCE_GRAPH_TYPE;
  uuid: string;
}
