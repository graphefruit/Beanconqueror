import {
  drawWhenPlotlyLoaded,
  loadPlotly,
  PLOTLY_SCRIPT,
} from '../load-plotly';

describe('loadPlotly', () => {
  let appended: HTMLScriptElement[];
  let originalPlotly: unknown;

  beforeEach(() => {
    originalPlotly = Reflect.get(window, 'Plotly');
    Reflect.deleteProperty(window, 'Plotly');
    appended = [];
    const head = document.head;
    const appendChild = <T extends Node>(_node: T): T =>
      Node.prototype.appendChild.call(head, _node) as T;
    spyOn(head, 'appendChild').and.callFake(<T extends Node>(_node: T): T => {
      if (_node instanceof HTMLScriptElement) {
        // Kept from the page, the test says when it loaded.
        appended.push(_node);
        return _node;
      }
      return appendChild(_node);
    });
  });

  afterEach(() => {
    if (originalPlotly === undefined) {
      Reflect.deleteProperty(window, 'Plotly');
    } else {
      Reflect.set(window, 'Plotly', originalPlotly);
    }
  });

  it('resolves at once when Plotly is already there', async () => {
    Reflect.set(window, 'Plotly', {});

    await loadPlotly();

    expect(appended).toEqual([]);
  });

  it('adds the script once and resolves every caller once it is loaded', async () => {
    const first = loadPlotly();
    const second = loadPlotly();

    expect(appended.length).toBe(1);
    expect(appended[0].getAttribute('src')).toBe(PLOTLY_SCRIPT);
    Reflect.set(window, 'Plotly', {});
    appended[0].dispatchEvent(new Event('load'));
    await expectAsync(Promise.all([first, second])).toBeResolved();
    await loadPlotly();
    expect(appended.length).toBe(1);
  });

  it('rejects when the script cannot be loaded and tries again on the next call', async () => {
    const failed = loadPlotly();
    appended[0].dispatchEvent(new Event('error'));
    await expectAsync(failed).toBeRejected();

    const next = loadPlotly();

    expect(appended.length).toBe(2);
    Reflect.set(window, 'Plotly', {});
    appended[1].dispatchEvent(new Event('load'));
    await expectAsync(next).toBeResolved();
  });

  it('draws once Plotly is loaded', async () => {
    const draw = jasmine.createSpy('draw');

    drawWhenPlotlyLoaded(draw);

    expect(draw).not.toHaveBeenCalled();
    Reflect.set(window, 'Plotly', {});
    appended[0].dispatchEvent(new Event('load'));
    await loadPlotly();
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('does not draw and logs when Plotly cannot be loaded', async () => {
    const draw = jasmine.createSpy('draw');
    const logged = new Promise<unknown[]>((_resolve) => {
      spyOn(console, 'error').and.callFake((..._args: unknown[]) =>
        _resolve(_args),
      );
    });

    drawWhenPlotlyLoaded(draw);
    appended[0].dispatchEvent(new Event('error'));

    const [message, error] = await logged;
    expect(message).toBe('Graph not drawn');
    expect(error).toEqual(jasmine.any(Error));
    expect(draw).not.toHaveBeenCalled();
  });
});
