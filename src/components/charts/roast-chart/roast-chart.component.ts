import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { RoastData } from 'src/app/shared/roasting-parser/roasting-data.model';

declare var Plotly;

@Component({
  selector: 'app-roast-chart',
  templateUrl: './roast-chart.component.html',
  styleUrls: ['./roast-chart.component.scss'],
})
export class RoastChartComponent implements OnChanges {
  @Input() roastData: RoastData;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.roastData && this.roastData) {
      this.renderChart();
    }
  }

  private renderChart(): void {
    const element = document.getElementById('roast-chart');
    const data = [
      {
        x: this.roastData.timeSeries.map(d => d.time),
        y: this.roastData.timeSeries.map(d => d.temp),
        type: 'scatter',
        name: 'Temperature'
      },
      {
        x: this.roastData.timeSeries.map(d => d.time),
        y: this.roastData.timeSeries.map(d => d.actual_fan_RPM),
        type: 'scatter',
        name: 'Fan Speed',
        yaxis: 'y2'
      }
    ];
    const layout = {
      title: 'Roast Profile',
      yaxis: { title: 'Temperature' },
      yaxis2: {
        title: 'Fan Speed',
        overlaying: 'y',
        side: 'right'
      }
    };
    Plotly.newPlot(element, data, layout);
  }
}
