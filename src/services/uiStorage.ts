/**Core**/
import {Injectable} from '@angular/core';
/**Ionic native**/
import { Storage } from '@ionic/storage';

@Injectable()
export class UIStorage {

  constructor(private storage: Storage) {
  }


  public set(_key: string, _val: any): Promise<any> {
    return this.storage.set(_key, _val)
  }

  public get(_key): Promise<any> {
    return this.storage.get(_key);
  }

}
