import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Brew } from 'src/classes/brew/brew';
import { Preparation } from 'src/classes/preparation/preparation';
import { PREPARATION_STYLE_TYPE } from 'src/enums/preparations/preparationStyleTypes';

declare var Plotly;

@Component({
  selector: 'app-brew-popover-extraction',
  templateUrl: './brew-popover-extraction.component.html',
  styleUrls: ['./brew-popover-extraction.component.scss'],
})
export class BrewPopoverExtractionComponent implements OnInit {
  public static COMPONENT_ID = 'brew-extraction';
  @Input() public brew: Brew;

  @ViewChild('extractionChartContent', { read: ElementRef })
  public extractionChartContent: ElementRef;

  protected heightInformationBlock: number = 50;
  protected widthInformationBlock: number = 50;

  constructor(
    private readonly modalController: ModalController,
    private translate: TranslateService
  ) {}

  public ngOnInit() {}
  public ionViewDidEnter(): void {
    if (this.brew) {
      setTimeout(() => {
        this.initializeExtractionChart(this.brew.getPreparation());
      }, 50);
    }
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange() {
    setTimeout(() => {
      try {
        this.initializeExtractionChart(this.brew.getPreparation());
      } catch (ex) {}
    }, 50);
  }

  public initializeExtractionChart(preparation: Preparation): void {
    try {
      let extractionChartData = [
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
          y: [1.72, 1.72, 1.72, 1.4, 1.4, 1.4, 1.15, 1.15, 1.15],
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
      const el = this.extractionChartContent.nativeElement;

      this.heightInformationBlock = el.offsetHeight - 40;
      this.widthInformationBlock = el.offsetWidth;

      const chartWidth: number = this.widthInformationBlock;
      const chartHeight: number = this.heightInformationBlock;
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
            text: this.translate.instant(
              'BREW_DATA_CALCULATED_EXTRACTION_YIELD'
            ),
          },
          fixedrange: true,
          range: [14, 28],
        },
        yaxis: {
          title: {
            text: this.translate.instant('BREW_DATA_TDS'),
          },
          fixedrange: true,
          range: [1.1, 1.8],
        },
      };

      if (preparation.style_type === PREPARATION_STYLE_TYPE.ESPRESSO) {
        extractionChartData = [
          {
            x: [18, 22, 22, 18, 18],
            y: [8, 8, 12, 12, 8],
            line: { color: '#CDC2AC' },
          },
          {
            x: [this.brew.getExtractionYield()],
            y: [this.brew.tds],
            marker: { color: '#CDC2AC', size: 15 },
          },
        ];
        extractionChartLayout.yaxis.range = [4, 16];
      }

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
