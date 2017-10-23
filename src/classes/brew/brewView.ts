/**Interfaces**/
import {IBrew} from "../../interfaces/brew/iBrew";

/**Classes**/
import {Config} from "../objectConfig/objectConfig";
import {Brew} from "../brew/brew";
export class BrewView {
  public title: string;
  public brews: Array<Brew>;

  constructor() {
    this.title = "";
    this.brews = [];
  }

}
