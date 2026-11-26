import { nfcPortContract } from '../contracts/nfc-port.contract';
import { FakeNfcPort } from '../fake-nfc-port';

nfcPortContract('FakeNfcPort', () => {
  const port = new FakeNfcPort();
  return {
    port,
    setEnabled: (enabled) => (port.enabled = enabled),
    answerScan: (answer) =>
      (port.scanAnswer =
        answer instanceof Error
          ? { ok: false, error: answer.message }
          : { ok: true, value: answer }),
    failWrites: (message) => (port.writeError = message),
    written: () => port.written,
    present: (tag, opensApp) => port.present({ tag, opensApp }),
  };
});

describe('FakeNfcPort', () => {
  it('tells when no one listens to a presented tag', () => {
    const port = new FakeNfcPort();

    expect(port.present({ opensApp: true })).toBeFalse();
    port.listen(jasmine.createSpy('onTag'));
    expect(port.present({ opensApp: true })).toBeTrue();
  });
});
