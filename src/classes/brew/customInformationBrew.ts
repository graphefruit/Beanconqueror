import { ICustomInformationBrew } from '../../interfaces/brew/ICustomInformationBrew';

export class CustomInformationBrew implements ICustomInformationBrew {
  public visualizer_id: string;

  constructor() {
    this.visualizer_id = '';
  }
}
