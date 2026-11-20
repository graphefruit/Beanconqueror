import { TestBed } from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Chart, registerables } from 'chart.js';

import {
  ChartTextAlternative,
  describeChart,
} from '../chart-text-alternative.service';

const texts: Record<string, string> = {
  'A11Y.CHART': 'Diagramm',
  'A11Y.CHART_NO_DATA': 'Keine Daten',
  'A11Y.CHART_RANGE':
    '{{count}} Werte von {{first}} bis {{last}}, Höchstwert {{max}} ({{maxLabel}}), Tiefstwert {{min}} ({{minLabel}})',
};

function t(key: string, params: Record<string, string> = {}): string {
  return texts[key].replace(/{{(\w+)}}/g, (_, name: string) => params[name]);
}

describe('describeChart', () => {
  it('reads a short series value by value after the title', () => {
    expect(
      describeChart(
        'Bohnen nach Land',
        ['Kenia', 'Brasilien', 'Äthiopien'],
        [{ label: '', data: [3, 1.5, null] }],
        'de',
        t,
      ),
    ).toBe('Bohnen nach Land. Kenia 3, Brasilien 1,5');
  });

  it('sums up a long series by its range, highest and lowest value', () => {
    const labels = Array.from({ length: 20 }, (_, day) => `${day + 1}.11.`);
    const data = labels.map((_, day) => (day === 6 ? 9 : day === 12 ? 0 : 2));

    expect(
      describeChart(
        'Brühungen pro Tag',
        labels,
        [{ label: 'V60', data }],
        'de',
        t,
      ),
    ).toBe(
      'Brühungen pro Tag. V60: 20 Werte von 1.11. bis 20.11., Höchstwert 9 (7.11.), Tiefstwert 0 (13.11.)',
    );
  });

  it('reads points with x and y and a time axis', () => {
    const day = new Date(2026, 10, 3).getTime();
    expect(
      describeChart(
        '',
        [],
        [{ label: 'Espresso', data: [{ x: day, y: 2 }] }],
        'en',
        t,
      ),
    ).toBe(`Diagramm. Espresso: ${new Date(day).toLocaleDateString('en')} 2`);
  });

  it('says when there is nothing to show', () => {
    expect(describeChart('Profile', [], [{ data: [] }], 'en', t)).toBe(
      'Profile. Keine Daten',
    );
  });
});

describe('ChartTextAlternative', () => {
  let card: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TranslateModule.forRoot()] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('de', { A11Y: { CHART: 'Diagramm' } });
    translate.use('de');
    Chart.register(...registerables);
    TestBed.inject(ChartTextAlternative).start();
    card = document.createElement('ion-card');
    card.innerHTML =
      '<ion-card-header role="heading" aria-level="2">Bohnen nach Land</ion-card-header><canvas></canvas>';
    document.body.appendChild(card);
  });

  afterEach(() => card.remove());

  it('names every chart after its card and its data, also after an update', () => {
    const chart = new Chart(card.querySelector('canvas'), {
      type: 'pie',
      data: { labels: ['Kenia'], datasets: [{ data: [3] }] },
      options: { animation: false },
    });
    const canvas = card.querySelector('canvas');

    expect(canvas.getAttribute('role')).toBe('img');
    expect(canvas.getAttribute('aria-label')).toBe('Bohnen nach Land. Kenia 3');

    chart.data.datasets[0].data = [4];
    chart.update();

    expect(canvas.getAttribute('aria-label')).toBe('Bohnen nach Land. Kenia 4');
    chart.destroy();
  });
});
