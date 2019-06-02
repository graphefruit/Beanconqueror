/** Interfacdes */
import {IConfig} from "../../interfaces/objectConfig/iObjectConfig";
export class Config implements IConfig {
  public uuid: string;
  public unix_timestamp:number;

  constructor() {
    this.uuid ="";
    this.unix_timestamp =0;
  }
}
