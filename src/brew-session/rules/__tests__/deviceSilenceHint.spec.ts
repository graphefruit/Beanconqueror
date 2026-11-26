import { deviceSilenceHint, DeviceSilenceState } from '../deviceSilenceHint';

describe('deviceSilenceHint', () => {
  const silentScale: DeviceSilenceState = {
    device: 'scale',
    sendsOnlyOnChange: false,
    timerRunning: false,
  };

  it('tells to turn a silent scale off and on again', () => {
    expect(deviceSilenceHint(silentScale)).toBe('DEVICE_SILENCE_HINT.SCALE');
  });

  it('asks to load a scale that sends only on a change', () => {
    expect(deviceSilenceHint({ ...silentScale, sendsOnlyOnChange: true })).toBe(
      'DEVICE_SILENCE_HINT.SCALE_ON_CHANGE',
    );
  });

  it('tells to turn a silent pressure sensor off and on again', () => {
    expect(deviceSilenceHint({ ...silentScale, device: 'pressure' })).toBe(
      'DEVICE_SILENCE_HINT.PRESSURE',
    );
  });

  it('says nothing while the brew runs', () => {
    expect(
      deviceSilenceHint({ ...silentScale, timerRunning: true }),
    ).toBeNull();
    expect(
      deviceSilenceHint({
        device: 'pressure',
        sendsOnlyOnChange: false,
        timerRunning: true,
      }),
    ).toBeNull();
  });
});
