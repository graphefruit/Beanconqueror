import { AnnotationGraphHelperService } from '../annotation-graph-helper.service';

describe('AnnotationGraphHelperService Meticulous overlays', () => {
  let service: AnnotationGraphHelperService;
  let relayout: jasmine.Spy;
  let originalPlotly: unknown;

  beforeEach(() => {
    service = new AnnotationGraphHelperService();
    originalPlotly = Reflect.get(window, 'Plotly');
    relayout = jasmine.createSpy('relayout');
    Reflect.set(window, 'Plotly', { relayout });
  });

  afterEach(() => {
    if (originalPlotly === undefined) {
      Reflect.deleteProperty(window, 'Plotly');
    } else {
      Reflect.set(window, 'Plotly', originalPlotly);
    }
  });

  it('renders valid metrics even when another metric is unavailable', () => {
    const start = new Date(2026, 0, 1).getTime();
    const x = [new Date(start), new Date(start + 1250)];
    const weightTrace = { x, y: [0, 12], name: 'Weight', yaxis: 'y' };
    const pressureTrace = { x, y: [0, 9], name: 'Pressure', yaxis: 'y4' };
    const temperatureTrace = {
      x,
      y: [undefined, null],
      name: 'Temperature',
      yaxis: 'y5',
    };
    const traces = { weightTrace, pressureTrace, temperatureTrace };
    const chartData = Object.values(traces);
    const layout = { shapes: [], annotations: [] };
    const element = { _fullLayout: {} };
    const range = service.getSliderRange(chartData);

    expect(range.maxSliderTime).toBe(1.25);
    service.updateSliderLineAndAnnotations(
      element,
      layout,
      chartData,
      traces,
      undefined,
      1.25,
      range.minTimeMs,
    );

    const update = relayout.calls.mostRecent().args[1];
    expect(
      update.annotations.map((annotation: { text: string }) => annotation.text),
    ).toEqual(['Weight: 12.0 g', 'Pressure: 9.0 bar']);
    expect(update.shapes[0].x0.getTime()).toBe(start + 1250);

    service.updateSliderLineAndAnnotations(
      element,
      layout,
      chartData,
      traces,
      undefined,
      0,
      range.minTimeMs,
    );
    expect(relayout.calls.mostRecent().args[1].annotations[0].text).toBe(
      'Weight: 0.0 g',
    );
  });
});
