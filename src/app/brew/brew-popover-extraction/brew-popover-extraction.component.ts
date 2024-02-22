import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Brew } from 'src/classes/brew/brew';

declare var Plotly;

@Component({
  selector: 'app-brew-popover-extraction',
  templateUrl: './brew-popover-extraction.component.html',
  styleUrls: ['./brew-popover-extraction.component.scss'],
})
export class BrewPopoverExtractionComponent implements OnInit {
  public static COMPONENT_ID = 'brew-extraction';
  @Input() public brew: Brew;

  constructor(private readonly modalController: ModalController) {}

  ngOnInit() {
    if (this.brew) {
      this.initializeExtractionChart();
    }
  }

  public initializeExtractionChart(): void {
    try {
      const extractionChartData = [
        {
          x: [19, 24, 24, 19, 19],
          y: [1.25, 1.25, 1.5, 1.5, 1.25],
          line: { color: '#CDC2AC' },
        },
        {
          x: [this.brew.getExtractionYield()],
          y: [this.brew.tds],
          marker: { color: '#CDC2AC', size: 15 },
        },
        {
          x: [17, 21.5, 26, 17, 21.5, 26, 17, 21.5, 26],
          y: [1.75, 1.75, 1.75, 1.4, 1.4, 1.4, 1.15, 1.15, 1.15],
          mode: 'text',
          text: [
            'STRONG<br>underextracted',
            'STRONG<br>',
            'STRONG<br>harsh',
            'underextracted',
            'IDEAL',
            'harsh',
            'WEAK<br>underextracted',
            'WEAK<br>',
            'WEAK<br>harsh',
          ],
          textposition: 'center',

          type: 'scatter',
        },
      ];

      const chartWidth: number = document.getElementById(
        'canvasContainerExtraction'
      ).offsetWidth;
      const chartHeight: number = 500;
      const extractionChartLayout = {
        width: chartWidth,
        height: chartHeight,
        margin: {
          l: 45,
          r: 45,
          b: 45,
          t: 45,
          pad: 0,
        },
        showlegend: false,
        dragmode: false,
        hovermode: false,
        clickmode: 'none',
        extendtreemapcolors: false,
        extendiciclecolors: false,
        xaxis: {
          title: {
            text: 'Extraction Yield (%)',
          },
          fixedrange: true,
          range: [14, 28],
        },
        yaxis: {
          title: {
            text: 'TDS (%)',
          },
          fixedrange: true,
          range: [1.1, 1.8],
        },
      };

      Plotly.newPlot(
        'extractionChart',
        extractionChartData,
        extractionChartLayout,
        this.getChartConfig()
      );
    } catch (ex) {}
  }

  private getChartConfig() {
    const config = {
      responsive: false,
      scrollZoom: false,
      displayModeBar: false, // this is the line that hides the bar.
    };
    return config;
  }

  public dismiss(): void {
    try {
      Plotly.purge('extractionChart');
    } catch (ex) {}
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewPopoverExtractionComponent.COMPONENT_ID
    );
  }
}
