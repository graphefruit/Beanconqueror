import { Brew } from '../../../../classes/brew/brew';
import { BrewAddComponent } from '../brew-add.component';

describe('BrewAddComponent coordinates', () => {
  const LATITUDE = 52.123456;
  const LONGITUDE = 13.654321;
  const LOG_LEVELS = ['log', 'info', 'debug', 'warn', 'error'];
  let uiLog: jasmine.SpyObj<any>;
  let component: BrewAddComponent;

  beforeEach(() => {
    uiLog = jasmine.createSpyObj('UILog', LOG_LEVELS);
    component = Object.assign(Object.create(BrewAddComponent.prototype), {
      data: new Brew(),
      settings: { track_brew_coordinates: true },
      uiLog,
    }) as BrewAddComponent;
    // The web side of the Geolocation plugin asks the browser.
    spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake((_found) =>
      _found({
        timestamp: 0,
        coords: {
          latitude: LATITUDE,
          longitude: LONGITUDE,
          accuracy: 5,
          altitude: 34,
          altitudeAccuracy: 3,
          heading: null,
          speed: null,
        } as GeolocationCoordinates,
      } as GeolocationPosition),
    );
  });

  it('stores the place of the brew and logs only that it was found', async () => {
    await component['setCoordinates'](true);

    expect(component.data.coordinates.latitude).toBe(LATITUDE);
    expect(component.data.coordinates.longitude).toBe(LONGITUDE);
    expect(uiLog.info).toHaveBeenCalledOnceWith('BREW - Coordinates found');
    for (const level of LOG_LEVELS) {
      expect(JSON.stringify(uiLog[level].calls.allArgs())).not.toMatch(
        /52\.1|13\.6|"altitude"/,
      );
    }
  });
});
