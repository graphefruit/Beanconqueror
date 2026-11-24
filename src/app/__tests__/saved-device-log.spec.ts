import { AppComponent } from '../app.component';

const DEVICE_ID = 'FE03A2F4-1B2C-4D5E-8F90-A1B2C3D4E5F6';

type ConnectMethod =
  | '__connectSmartScale'
  | '__connectPressureDevice'
  | '__connectTemperatureDevice'
  | '__connectRefractometerDevice';

function connectWith(method: ConnectMethod, settings: Record<string, string>) {
  const log = jasmine.createSpy('log');
  const autoConnect = jasmine.createSpy('autoConnect');
  const component = Object.assign(Object.create(AppComponent.prototype), {
    uiSettingsStorage: { getSettings: () => settings },
    uiLog: { log },
    bleManager: {
      autoConnectScale: autoConnect,
      autoConnectPressureDevice: autoConnect,
      autoConnectTemperatureDevice: autoConnect,
      autoConnectRefractometerDevice: autoConnect,
    },
  }) as Record<ConnectMethod, () => void>;
  component[method]();
  return {
    messages: log.calls.allArgs().map((args) => args.join(' ')),
    autoConnect,
  };
}

describe('AppComponent saved device logging', () => {
  const cases: [ConnectMethod, string][] = [
    ['__connectSmartScale', 'scale_id'],
    ['__connectPressureDevice', 'pressure_id'],
    ['__connectTemperatureDevice', 'temperature_id'],
    ['__connectRefractometerDevice', 'refractometer_id'],
  ];

  for (const [method, key] of cases) {
    it(`${method} logs only that a device is saved, not its id`, () => {
      const { messages, autoConnect } = connectWith(method, {
        [key]: DEVICE_ID,
      });

      expect(autoConnect).toHaveBeenCalled();
      expect(messages.some((m) => m.includes('Saved: true'))).toBeTrue();
      for (const message of messages) {
        expect(message).not.toContain(DEVICE_ID);
      }
    });

    it(`${method} logs when no device is saved`, () => {
      const { messages, autoConnect } = connectWith(method, {});

      expect(autoConnect).not.toHaveBeenCalled();
      expect(messages.some((m) => m.includes('Saved: false'))).toBeTrue();
    });
  }
});
