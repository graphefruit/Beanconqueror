import {AfterViewInit, Component, EventEmitter, Output, ViewChild} from '@angular/core';
import {Chart} from 'chart.js';
import {ICupping} from '../../interfaces/cupping/iCupping';
import {Subject} from 'rxjs';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';
import {TranslateService} from '@ngx-translate/core';
import {UIBrewHelper} from '../../services/uiBrewHelper';

@Component({
  selector: 'cupping-radar',
  templateUrl: './cupping-radar.component.html',
  styleUrls: ['./cupping-radar.component.scss'],
})
export class CuppingRadarComponent implements AfterViewInit {

  private chartEl: any = undefined;
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
  @ViewChild('cuppingChart', {static: false}) public cuppingChart;

  @Output() public cuppingChanged: EventEmitter<any> = new EventEmitter();

  private debounceCounter: number = 0;
  constructor(private readonly translate: TranslateService, private uiBrewHelper: UIBrewHelper) {
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
    this.debounceRadar.next(this.debounceCounter.toString());
    this.debounceCounter++;
  }

  public getCuppingValues() {
    return this.model;
  }

  public rangeChanged(_query): void {
    this.cuppingChanged.emit();
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
    return this.toFixedIfNecessary(score,2);

  }

  private toFixedIfNecessary( value, dp ){
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return 0;
    }
    return +parsedFloat.toFixed( dp );
  }
  private __loadCuppingChart(): void {

    if (this.chartEl !== undefined) {
      this.chartEl.destroy();
      this.chartEl = undefined;
    }

    this.chartEl = new Chart(this.cuppingChart.nativeElement, this.uiBrewHelper.getCuppingChartData(this.model) as any);



  }


}
