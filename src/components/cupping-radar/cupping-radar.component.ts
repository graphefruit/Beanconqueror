import {AfterViewInit, Component, ViewChild} from '@angular/core';
import {Chart} from 'chart.js';
import {ICupping} from '../../interfaces/cupping/iCupping';
import {Subject} from 'rxjs';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';
import {TranslateService} from '@ngx-translate/core';
import {UIHelper} from '../../services/uiHelper';

@Component({
  selector: 'cupping-radar',
  templateUrl: './cupping-radar.component.html',
  styleUrls: ['./cupping-radar.component.scss'],
})
export class CuppingRadarComponent implements AfterViewInit {

  public model: ICupping = {
    body: 0,
    brightness: 0,
    clean_cup: 0,
    complexity: 0,
    cuppers_correction: 0,
    dry_fragrance: 0,
    finish: 0,
    flavor: 0,
    sweetness: 0,
    uniformity: 0,
    wet_aroma: 0,
    notes: '',
  };
  public debounceRadar: Subject<string> = new Subject<string>();
  private chuppingChartObj: any = undefined;
  @ViewChild('cuppingChart', {static: false}) public cuppingChart;

  constructor(private readonly translate: TranslateService, private uiHelper: UIHelper) {
  }

  public ngOnInit(): void {
    this.debounceRadar
      .pipe(debounceTime(1000), distinctUntilChanged())
      .subscribe(() => {
        this.__loadCuppingChart();
      });

  }

  public ionViewDidEnter(): void {


    // If we don't have beans, we cant do a brew from now on, because of roasting degree and the age of beans.
  }

  public ngAfterViewInit() {
    this.__loadCuppingChart();
  }

  public setCuppingValues(_values: ICupping) {

    this.model = _values;

    this.debounceRadar.next();
  }

  public getCuppingValues() {
    return this.model;
  }

  public rangeChanged(_query): void {
    this.debounceRadar.next(_query);
  }


  public getScore() {
    const score: number = this.model.dry_fragrance +
      this.model.wet_aroma +
      this.model.brightness +
      this.model.flavor +
      this.model.body +
      this.model.finish +
      this.model.sweetness +
      this.model.clean_cup +
      this.model.complexity +
      this.model.uniformity +
      this.model.cuppers_correction;

    return score;
  }

  private __loadCuppingChart(): void {


    const cuppingData = {
      labels: [
        this.translate.instant('CUPPING_SCORE_DRY_FRAGRANCE'),
        this.translate.instant('CUPPING_SCORE_WET_AROMA'),
        this.translate.instant('CUPPING_SCORE_BRIGHTNESS'),
        this.translate.instant('CUPPING_SCORE_FLAVOR'),
        this.translate.instant('CUPPING_SCORE_BODY'),
        this.translate.instant('CUPPING_SCORE_FINISH'),
        this.translate.instant('CUPPING_SCORE_SWEETNESS'),
        this.translate.instant('CUPPING_SCORE_CLEAN_CUP'),
        this.translate.instant('CUPPING_SCORE_COMPLEXITY'),
        this.translate.instant('CUPPING_SCORE_UNIFORMITY'),
      ],
      datasets: [
        {
          fillColor: 'rgba(220,220,220,0.5)',
          strokeColor: 'rgba(220,220,220,1)',
          pointColor: 'rgba(220,220,220,1)',
          pointStrokeColor: '#fff',
          data: [
            this.model.dry_fragrance,
            this.model.wet_aroma,
            this.model.brightness,
            this.model.flavor,
            this.model.body,
            this.model.finish,
            this.model.sweetness,
            this.model.clean_cup,
            this.model.complexity,
            this.model.uniformity
          ]
        }]
    };
    const chartOptions = {
      responsive: true,
      legend: false,
      title: {
        display: false,
        text: '',
      },

      scale: {
        ticks: {
          beginAtZero: true,
          max: 10,
          min: 0,
          step: 0.1
        }
      },
      tooltips: {
        // Disable the on-canvas tooltip
        enabled: false,
      },
      maintainAspectRatio: true,
      aspectRatio: 1,
    };
    this.chuppingChartObj = new Chart(this.cuppingChart.nativeElement, {
      type: 'radar',
      data: cuppingData,
      options: chartOptions
    });
  }


}
