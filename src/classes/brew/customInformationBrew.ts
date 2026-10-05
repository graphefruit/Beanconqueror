import { ICustomInformationBrew } from '../../interfaces/brew/ICustomInformationBrew';
import type { IHandoffImport } from '../../interfaces/brew/IHandoff';

export class CustomInformationBrew implements ICustomInformationBrew {
  public visualizer_id: string;
  public imported?: IHandoffImport;

  constructor() {
    this.visualizer_id = '';
  }
}
