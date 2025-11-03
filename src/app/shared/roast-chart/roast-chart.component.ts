import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { RoastData } from '../roasting-parser/roasting-data.model';
declare const Plotly: any;

@Component({
  selector: 'app-roast-chart',
  template: `<div #chart></div>`,
  standalone: false,
})
export class RoastChartComponent implements OnChanges {
  @Input() roastData: RoastData;
  @ViewChild('chart', { static: true }) chartElement: ElementRef;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.roastData && this.roastData) {
      this.createChart();
    }
  }

  private createChart(): void {
    const element = this.chartElement.nativeElement;

    const trace = {
      x: this.roastData.timeSeries.map((p) => p.time),
      y: this.roastData.timeSeries.map((p) => p.temp),
      mode: 'lines',
      type: 'scatter',
    };

    const layout = {
      title: 'Roast Profile',
      xaxis: {
        title: 'Time (seconds)',
      },
      yaxis: {
        title: 'Temperature',
      },
    };

    Plotly.newPlot(element, [trace], layout);
  }
}
