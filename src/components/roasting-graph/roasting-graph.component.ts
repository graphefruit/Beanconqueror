import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { RoastingFlow } from 'src/classes/roasting/roastingFlow';
import { RoastingGraphHelperService } from 'src/services/roastingGraphHelper/roasting-graph-helper.service';

declare var Plotly;

@Component({
  selector: 'roasting-graph',
  templateUrl: './roasting-graph.component.html',
  styleUrls: ['./roasting-graph.component.scss'],
  standalone: false,
})
export class RoastingGraphComponent implements OnInit, OnChanges {
  @ViewChild('profileDiv', { static: true })
  public profileDiv: ElementRef;
  @ViewChild('canvaContainer', { read: ElementRef, static: true })
  public canvaContainer: ElementRef;

  @Input()
  public flow: RoastingFlow;

  @Input()
  public isDetail: boolean;

  private traces: any = {};
  private chartData = [];
  private lastChartLayout: any;

  constructor(private readonly graphHelper: RoastingGraphHelperService) {}

  ngOnInit() {
    this.initializeFlowChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.flow && !changes.flow.firstChange) {
      this.updateChart();
    }
  }

  private initializeFlowChart(): void {
    try {
      Plotly.purge(this.profileDiv.nativeElement);
    } catch (ex) {}

    this.traces = this.graphHelper.initializeTraces();
    this.traces = this.graphHelper.fillTraces(this.traces, null, this.isDetail);
    this.traces = this.graphHelper.fillDataIntoTraces(this.flow, this.traces);

    this.chartData.push(this.traces.temperatureTrace);
    this.chartData.push(this.traces.fanTrace);
    this.chartData.push(this.traces.heatTrace);

    this.lastChartLayout = this.graphHelper.getChartLayout(
      this.traces,
      this.isDetail,
      this.canvaContainer.nativeElement.offsetWidth,
      150,
    );

    Plotly.newPlot(
      this.profileDiv.nativeElement,
      this.chartData,
      this.lastChartLayout,
      this.graphHelper.getChartConfig(),
    );
  }

  private updateChart(): void {
    this.traces = this.graphHelper.fillDataIntoTraces(this.flow, this.traces);
    Plotly.redraw(this.profileDiv.nativeElement);
  }
}
