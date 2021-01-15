/** Core */
import {Injectable} from '@angular/core';
import {Platform} from '@ionic/angular';
/** Ionic */


declare var navigator;

@Injectable({
  providedIn: 'root'
})
export class UIHealthKit {

  constructor(private platform: Platform) {
  }



  public isAvailable(): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      if (this.platform.is('ios') && this.platform.is('cordova')) {
      navigator.health.isAvailable((e) => {
        resolve(true)
      }, (e) => {
        reject(false);
      })
      } else {
        reject(false);
      }
    });
    return promise;
  }


  public requestAuthorization(): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      this.isAvailable().then( () => {

        navigator.health.requestAuthorization([
          'nutrition.caffeine',   // Read and write permissions
          {
            write : []  // Write only permission
          }
        ], (e) => {
          resolve();
        }, (e) => {
          reject();
        });
      }, (e) => {
        reject();
      })

    });
    return promise;

  }

  public trackCaffeineConsumption(_quantity:number, _date: Date) {
    try{
      navigator.health.store({
        startDate: _date, // three days ago
        endDate: _date, // now
        dataType: 'nutrition.caffeine',
        value:_quantity * 0.008,
        unit:'g',

      }, (e) => {

      }, (e) => {

      });
    }
    catch (ex) {

    }

  }


}
