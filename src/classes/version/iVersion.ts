/** Interfaces */
/** Enums */
/** Classes */
import {Config} from '../objectConfig/objectConfig';
import {IVersion} from '../../interfaces/version/iVersion';


export class Version implements IVersion {

  public config: Config;
  public alreadyDisplayedVersions: Array<string>;

  // Inherits all showable version updates, used from config.xml
  private updatedVersions: Array<string> = ['5.0.0'];


  constructor() {

    this.alreadyDisplayedVersions = [];
    this.config = new Config();

  }

  public initializeByObject(versionObj: IVersion): void {
    Object.assign(this, versionObj);
  }

  public pushUpdatedVersion(updatedVersion: string) {
    this.alreadyDisplayedVersions.push(updatedVersion);
  }

  public whichUpdateScreensShallBeDisplayed(actualAppVersion: string): Array<string> {

      const versionCode: string = actualAppVersion;
      const filteredVersions = this.updatedVersions.filter((e)=> this.alreadyDisplayedVersions.filter((b) => b === e).length === 0);

      const displayVersions: Array<string> = [];
      for (const v of filteredVersions) {
        const compare = this.versionCompare(versionCode,v);
        if (compare >=0) {
          displayVersions.push(v);
        }
      }
      return displayVersions;
  }

  private  versionCompare(_actualAppVersion, _updateVersion) {
    const actualVersion = parseInt(_actualAppVersion.replace(/[.]/g,''),0);
    const replacedVersion = parseInt(_updateVersion.replace(/[.]/g,''),0);
    if (actualVersion > replacedVersion) {
      return -1
    } else if (actualVersion === replacedVersion) {
      return 0;
    }
    return 1;


  }


}
