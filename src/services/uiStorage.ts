/**  Core */
import {Injectable} from '@angular/core';
/**
 * Ionic native
 *
 */
import {Storage} from '@ionic/storage';


@Injectable({
  providedIn: 'root'
})
export class UIStorage {

  constructor (private readonly storage: Storage) {
  }

  public async set (_key: string, _val: any): Promise<any> {
    return this.storage.set(_key, _val);
  }

  public async get (_key): Promise<any> {
    return this.storage.get(_key);
  }

  public async export (): Promise<any> {

    const promise = new Promise((resolve, reject) => {
      const exportObj = {};

      this.storage.forEach((_value, _key, _index) => {
        debugger;
        exportObj[_key] = _value;

      })
        .then(() => {
          resolve(exportObj);
        });
    });

    return promise;
  }

  public async import (_data: any): Promise<any> {

    // Before we import, we do a saftey backup
    const promise = new Promise((resolve, reject) => {

      this.__safteyBackup()
        .then((_backup) => {

        this.__importBackup(_data)
          .then(() => {
          // Successfully imported backup
          resolve({BACKUP: false});
        }, () => {
          this.__importBackup(_backup)
            .then(() => {
            resolve({BACKUP: true});
          }, () => {
            reject({BACKUP: true});
          });
        });
      });

    });

    return promise;

  }

  private async __safteyBackup (): Promise<any> {
    const promise = new Promise((resolve, reject) => {
      this.export()
        .then(
          (_data) => {
            resolve(_data);
          });
    });

    return promise;

  }

  private async __importBackup (_data): Promise<any> {
    const promise = new Promise((resolve, reject) => {

      const keysCount: number = Object.keys(_data).length;
      let finishedImport: number = 0;
      for (const key in _data) {
        if (_data.hasOwnProperty(key)) {
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
      }
    });

    return promise;
  }

}
