/** Core */
import { Injectable, inject } from '@angular/core';
import { Platform } from '@ionic/angular/standalone';
/** Ionic */

declare var navigator;

@Injectable({
  providedIn: 'root',
})
export class UIHealthKit {
  private platform = inject(Platform);

  public isAvailable(): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      if (this.platform.is('ios') && this.platform.is('capacitor')) {
        navigator.health.isAvailable(
          (e) => {
            resolve(true);
          },
          (e) => {
            reject(false);
          },
        );
      } else {
        reject(false);
      }
    });
    return promise;
  }

  public requestAuthorization(): Promise<any> {
    const promise = new Promise(async (resolve, reject) => {
      this.isAvailable().then(
        () => {
          navigator.health.requestAuthorization(
            [
              'nutrition.caffeine', // Read and write permissions
              {
                write: [], // Write only permission
              },
            ],
            (e) => {
              resolve(undefined);
            },
            (e) => {
              reject();
            },
          );
        },
        (e) => {
          reject();
        },
      );
    });
    return promise;
  }

  public trackCaffeineConsumption(_amount: number, _date: Date) {
    try {
      navigator.health.store(
        {
          startDate: _date, // three days ago
          endDate: _date, // now
          dataType: 'nutrition.caffeine',
          value: _amount,
          unit: 'g',
        },
        (e) => {},
        (e) => {},
      );
    } catch (ex) {}
  }
}
