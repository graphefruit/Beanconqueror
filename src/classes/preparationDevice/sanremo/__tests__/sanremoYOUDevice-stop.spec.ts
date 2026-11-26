import { UILog } from '../../../../services/uiLog';
import { Preparation } from '../../../preparation/preparation';
import { SanremoStopResult, SanremoYOUDevice } from '../sanremoYOUDevice';

describe('SanremoYOUDevice stop confirmation', () => {
  let device: SanremoYOUDevice;
  let socket: {
    readyState: number;
    send: jasmine.Spy;
    close: jasmine.Spy;
    onmessage?: (event: { data: string }) => void;
  };
  let log: jasmine.SpyObj<UILog>;
  let onResend: jasmine.Spy;
  let result: SanremoStopResult | undefined;

  function report(groupStatus: number) {
    socket.onmessage({ data: JSON.stringify({ status: 1, groupStatus }) });
  }
  function sentStops(): unknown[] {
    return socket.send.calls
      .allArgs()
      .map(([data]) => JSON.parse(data) as unknown);
  }
  async function flush() {
    await Promise.resolve();
    await Promise.resolve();
  }
  function stop() {
    void device.stopActualShot(onResend).then((_result) => (result = _result));
  }

  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2026, 10, 25, 8, 0, 0));
    log = jasmine.createSpyObj('UILog', ['info', 'error']);
    spyOn(UILog, 'getInstance').and.returnValue(log);
    socket = {
      readyState: 1,
      send: jasmine.createSpy('send'),
      close: jasmine.createSpy('close'),
    };
    spyOn(window as any, 'WebSocket').and.returnValue(socket);
    const preparation = {
      connectedPreparationDevice: { url: 'http://192.168.1.20' },
    } as unknown as Preparation;
    device = new SanremoYOUDevice(undefined, preparation);
    void device.connectToSocket();
    onResend = jasmine.createSpy('onResend');
    result = undefined;
    report(2);
  });

  afterEach(() => {
    device.disconnectSocket();
    jasmine.clock().uninstall();
  });

  it('confirms the stop once the machine reports 0', async () => {
    stop();
    expect(sentStops()).toEqual([{ key: 220, id: 2, value: 0 }]);
    jasmine.clock().tick(100);
    report(2);
    jasmine.clock().tick(250);
    report(0);
    jasmine.clock().tick(249);
    await flush();
    expect(result).toBeUndefined();

    jasmine.clock().tick(1);
    await flush();
    expect(result).toBe('confirmed');
    expect(sentStops().length).toBe(1);
    expect(onResend).not.toHaveBeenCalled();
  });

  it('resends once when the machine still runs after 600 ms', async () => {
    stop();
    report(2);
    jasmine.clock().tick(599);
    expect(sentStops().length).toBe(1);

    jasmine.clock().tick(1);
    expect(sentStops()).toEqual([
      { key: 220, id: 2, value: 0 },
      { key: 220, id: 2, value: 0 },
    ]);
    expect(onResend).toHaveBeenCalledTimes(1);

    report(0);
    jasmine.clock().tick(600);
    await flush();
    expect(result).toBe('confirmed');
  });

  it('resends at once when the shot restarts after a 0', async () => {
    stop();
    jasmine.clock().tick(300);
    report(0);
    jasmine.clock().tick(100);
    report(3);

    expect(sentStops()).toEqual([
      { key: 220, id: 2, value: 0 },
      { key: 220, id: 3, value: 0 },
    ]);
    expect(onResend).toHaveBeenCalledTimes(1);

    report(0);
    jasmine.clock().tick(600);
    await flush();
    expect(result).toBe('confirmed');
  });

  it('sends no third stop when the resend is ignored as well', async () => {
    stop();
    jasmine.clock().tick(600);
    report(2);
    jasmine.clock().tick(600);
    await flush();

    expect(sentStops().length).toBe(2);
    expect(result).toBe('failed');
    expect(log.error.calls.count()).toBeGreaterThan(0);

    jasmine.clock().tick(5000);
    report(2);
    expect(sentStops().length).toBe(2);
  });

  it('does not send when the socket is not open', async () => {
    socket.readyState = 3;
    stop();
    await flush();
    expect(socket.send).not.toHaveBeenCalled();
    expect(result).toBe('not_connected');
  });

  it('does not send when no shot is running', async () => {
    report(0);
    stop();
    await flush();
    expect(socket.send).not.toHaveBeenCalled();
    expect(result).toBe('not_running');
  });

  it('reports a failed send as not connected', async () => {
    socket.send.and.throwError('closed');
    stop();
    await flush();
    expect(result).toBe('not_connected');
  });

  it('ends the watch without a resend when disconnected', async () => {
    stop();
    device.disconnectSocket();
    jasmine.clock().tick(2000);
    await flush();

    expect(result).toBe('aborted');
    expect(sentStops().length).toBe(1);
  });

  it('keeps one watch when the stop is triggered twice', async () => {
    stop();
    stop();
    expect(sentStops().length).toBe(1);
    report(0);
    jasmine.clock().tick(600);
    await flush();
    expect(result).toBe('confirmed');
  });

  it('logs no host address', () => {
    stop();
    jasmine.clock().tick(1200);
    const logged = JSON.stringify([
      log.info.calls.allArgs(),
      log.error.calls.allArgs(),
    ]);
    expect(logged).not.toContain('192.168');
  });
});
