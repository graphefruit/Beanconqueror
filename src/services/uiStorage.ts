/**  Core */
import { Injectable } from '@angular/core';

/**
 * Ionic native
 * **/
import { Storage  } from '@ionic/storage';

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

  public export(): Promise<any> {

    const promise = new Promise((resolve, reject) => {
      const exportObj = {};
      this.storage.forEach((_value, _key, _index) => {
        exportObj[_key] = _value;

      })
        .then(() => {
          resolve(exportObj);
        });
    });

    return promise;
  }

  private __safteyBackup(): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      this.export()
        .then(
          (_data) => {
            resolve(_data);
          });
    });
    return promise;

  }

  private __importBackup(_data): Promise<any> {
    const promise = new Promise((resolve, reject) => {

      const keysCount: number = Object.keys(_data).length;
      let finishedImport: number = 0;
      for (const key of _data) {
        this.storage.set(key, _data[key])
          .then(() => {
            finishedImport++;
            if (keysCount === finishedImport) {
              resolve();
            }
          }, () => {
            reject();
          });
      }
    });
    return promise;
  }

  public import(_data: any): Promise<any> {

    //Before we import, we do a saftey backup
    var promise = new Promise((resolve, reject) => {

      this.__safteyBackup().then((_backup) => {

        this.__importBackup(_data).then(() => {
          //Successfully imported backup
          resolve({"BACKUP": false});
        }, () => {
          this.__importBackup(_backup).then(() => {
            resolve({"BACKUP": true});
          }, () => {
            reject({"BACKUP": true})
          })
        })
      });

    });

    return promise;

  }


}
