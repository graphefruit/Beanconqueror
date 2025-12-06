import { Bean } from '../../classes/bean/bean';

export interface BeanGroup {
  frozenGroupId: string;
  beans: Bean[];
  expanded: boolean;
}
