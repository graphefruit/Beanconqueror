import { IConfig } from '../objectConfig/iObjectConfig';

export interface IVersion {
  alreadyDisplayedVersions: Array<string>;
  config: IConfig;
}
