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
  function ack() {
    socket.onmessage({ data: JSON.stringify({ key: 220, success: true }) });
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

  it('confirms the stop once the machine stays at 0', async () => {
    stop();
    expect(sentStops()).toEqual([{ key: 220, id: 2, value: 0 }]);
    jasmine.clock().tick(300);
    report(0);
    jasmine.clock().tick(1699);
    await flush();
    expect(result).toBeUndefined();

    jasmine.clock().tick(1);
    await flush();
    expect(result).toBe('confirmed');
    expect(sentStops().length).toBe(1);
    expect(onResend).not.toHaveBeenCalled();
  });

  it('does not resend an acknowledged stop the machine shows after 900 ms', async () => {
    stop();
    jasmine.clock().tick(10);
    ack();
    for (let t = 10; t < 900; t += 300) {
      jasmine.clock().tick(300);
      report(2);
    }
    report(0);
    jasmine.clock().tick(300);
    report(0);
    jasmine.clock().tick(800);
    await flush();

    expect(sentStops().length).toBe(1);
    expect(onResend).not.toHaveBeenCalled();
    expect(result).toBe('confirmed');
    expect(JSON.stringify(log.info.calls.allArgs())).toContain(
      'Stop acknowledged',
    );
  });

  it('resends once when the acknowledged stop still runs after 3 s', async () => {
    stop();
    ack();
    report(2);
    jasmine.clock().tick(2999);
    expect(sentStops().length).toBe(1);

    jasmine.clock().tick(1);
    expect(sentStops().length).toBe(2);
    expect(onResend).toHaveBeenCalledTimes(1);

    report(0);
    jasmine.clock().tick(2000);
    await flush();
    expect(result).toBe('confirmed');
  });

  it('resends once when an unacknowledged stop still runs after 1.2 s', async () => {
    stop();
    report(2);
    jasmine.clock().tick(1199);
    expect(sentStops().length).toBe(1);

    jasmine.clock().tick(1);
    expect(sentStops()).toEqual([
      { key: 220, id: 2, value: 0 },
      { key: 220, id: 2, value: 0 },
    ]);
    expect(onResend).toHaveBeenCalledTimes(1);
  });

  it('resends at once when the shot restarts after a 0', async () => {
    stop();
    jasmine.clock().tick(300);
    report(0);
    jasmine.clock().tick(900);
    report(3);

    expect(sentStops()).toEqual([
      { key: 220, id: 2, value: 0 },
      { key: 220, id: 3, value: 0 },
    ]);
    expect(onResend).toHaveBeenCalledTimes(1);

    report(0);
    jasmine.clock().tick(2000);
    await flush();
    expect(result).toBe('confirmed');
  });

  it('sends no third stop when the resend is ignored as well', async () => {
    stop();
    jasmine.clock().tick(1200);
    report(2);
    jasmine.clock().tick(1200);
    await flush();

    expect(sentStops().length).toBe(2);
    expect(result).toBe('failed');
    expect(log.error.calls.count()).toBeGreaterThan(0);

    jasmine.clock().tick(5000);
    report(2);
    expect(sentStops().length).toBe(2);
  });

  it('sends a stop requested during a reconnect once the machine reports a running shot', async () => {
    socket.readyState = 0;
    stop();
    expect(socket.send).not.toHaveBeenCalled();

    jasmine.clock().tick(1500);
    socket.readyState = 1;
    report(1);
    expect(sentStops()).toEqual([{ key: 220, id: 1, value: 0 }]);

    report(0);
    jasmine.clock().tick(2000);
    await flush();
    expect(result).toBe('confirmed');
  });

  it('does not send a stop requested during a reconnect when the machine reports 0', async () => {
    socket.readyState = 0;
    stop();
    socket.readyState = 1;
    report(0);
    await flush();

    expect(socket.send).not.toHaveBeenCalled();
    expect(result).toBe('not_running');
  });

  it('gives up a stop requested during a reconnect after 5 s', async () => {
    socket.readyState = 0;
    stop();
    jasmine.clock().tick(4999);
    await flush();
    expect(result).toBeUndefined();

    jasmine.clock().tick(1);
    await flush();
    expect(result).toBe('not_connected');
    expect(socket.send).not.toHaveBeenCalled();
  });

  it('aborts a waiting stop when the brew disconnects', async () => {
    socket.readyState = 0;
    stop();
    device.disconnectSocket();
    await flush();
    expect(result).toBe('aborted');
  });

  it('retries a connection that is not open after 3 s', () => {
    device.disconnectSocket();
    socket.close.calls.reset();
    socket.readyState = 0;
    void device.connectToSocket();
    jasmine.clock().tick(2999);
    expect(socket.close).not.toHaveBeenCalled();

    jasmine.clock().tick(1);
    expect(socket.close).toHaveBeenCalled();
    jasmine.clock().tick(500);
    expect(window.WebSocket).toHaveBeenCalledTimes(3);
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
    jasmine.clock().tick(2000);
    await flush();
    expect(result).toBe('confirmed');
  });

  it('logs no host address', () => {
    stop();
    jasmine.clock().tick(5000);
    const logged = JSON.stringify([
      log.info.calls.allArgs(),
      log.error.calls.allArgs(),
    ]);
    expect(logged).not.toContain('192.168');
  });
});
