import { FlowSeriesBuffer } from '../flow-series-buffer';
import { describeFlowGraph } from '../graph-text-alternative';
import type { SeriesDef } from '../series-def';

const TEXTS: Record<string, string> = {
  'A11Y.CHART_RANGE':
    '{{count}} values from {{first}} to {{last}}, highest {{max}} ({{maxLabel}}), lowest {{min}} ({{minLabel}})',
  'A11Y.CHART_NO_DATA': 'No data',
};

function t(key: string, params: Record<string, string> = {}): string {
  return (TEXTS[key] ?? key).replace(/{{(\w+)}}/g, (_, name) => params[name]);
}

function def(id: SeriesDef['id'], label: string, unit: string): SeriesDef {
  return {
    id,
    kind: 'live',
    label,
    unit,
    axisId: 'weight',
    colour: { light: '#000000', dark: '#ffffff' },
  };
}

describe('describeFlowGraph', () => {
  it('reads out a short series value by value at m:ss', () => {
    const buffer = new FlowSeriesBuffer();
    buffer.append('pressure', 0, 1);
    buffer.append('pressure', 61, 9.25);

    expect(
      describeFlowGraph(
        'Flow profile graph',
        buffer,
        [def('pressure', 'Pressure', 'bar'), def('weight', 'Weight', 'g')],
        'en',
        t,
      ),
    ).toBe('Flow profile graph. Pressure (bar): 0:00 1, 1:01 9.25');
  });

  it('sums up a long series with its range', () => {
    const buffer = new FlowSeriesBuffer();
    for (let i = 0; i <= 300; i++) {
      buffer.append('weight', i / 10, i / 10);
    }

    expect(
      describeFlowGraph(
        'Graph',
        buffer,
        [def('weight', 'Weight', '')],
        'de',
        t,
      ),
    ).toBe(
      'Graph. Weight: 301 values from 0:00 to 0:30, highest 30 (0:30), lowest 0 (0:00)',
    );
  });

  it('says that there is no data', () => {
    expect(
      describeFlowGraph('Graph', new FlowSeriesBuffer(), [], 'en', t),
    ).toBe('Graph. No data');
  });
});
