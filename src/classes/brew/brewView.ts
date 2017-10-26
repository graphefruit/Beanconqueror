/**Classes**/
import {Brew} from "../brew/brew";
export class BrewView {
  public title: string;
  public brews: Array<Brew>;

  constructor() {
    this.title = "";
    this.brews = [];
  }

}
