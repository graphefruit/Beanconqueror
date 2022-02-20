import {Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ModalController, Platform} from '@ionic/angular';
import {Subscription} from 'rxjs';
import {Brew} from '../../../classes/brew/brew';
import {UIHelper} from '../../../services/uiHelper';
import {ScreenOrientation} from '@ionic-native/screen-orientation/ngx';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIBrewHelper} from '../../../services/uiBrewHelper';
import {PREPARATION_STYLE_TYPE} from '../../../enums/preparations/preparationStyleTypes';
import {Settings} from '../../../classes/settings/settings';
import {BrewBrewingComponent} from '../../../components/brews/brew-brewing/brew-brewing.component';
import {AgVirtualSrollComponent} from 'ag-virtual-scroll';


@Component({
  selector: 'brew-flow',
  templateUrl: './brew-flow.component.html',
  styleUrls: ['./brew-flow.component.scss'],
})
export class BrewFlowComponent implements OnInit, OnDestroy {
  public static COMPONENT_ID: string = 'brew-flow';
  @ViewChild('smartScaleWeight', {read: ElementRef}) public smartScaleWeightEl: ElementRef;
  @ViewChild('smartScaleWeightPerSecond', {read: ElementRef}) public smartScaleWeightPerSecondEl: ElementRef;
  @ViewChild('smartScaleAvgFlowPerSecond', {read: ElementRef}) public smartScaleAvgFlowPerSecondEl: ElementRef;
  public showBloomTimer: boolean = false;
  public showDripTimer: boolean = false;
  @Input() private flowChart: any;
  @Input() private flowChartEl: any;
  @Input() private brewFlowGraphEvent: EventEmitter<any>;
  @Input() private brew: Brew;
  @Input() private brewComponent: BrewBrewingComponent;
  @Input() private isDetail: boolean = false;
  private brewFlowGraphSubscription: Subscription;
  @ViewChild('flowContent',{read: ElementRef}) public flowContent: ElementRef;
  constructor (private readonly modalController: ModalController,
               private readonly screenOrientation: ScreenOrientation,
               private readonly uiHelper: UIHelper,
               private readonly uiSettingsStorage: UISettingsStorage,
               private readonly uiBrewHelper: UIBrewHelper) {
  }

  public async ngOnInit () {


    this.flowChartEl.options.responsive = false;
    this.flowChartEl.update('quite');


    await new Promise((resolve) => {
      setTimeout(() => {
        document.getElementById('brewFlowContainer').append(this.flowChartEl.ctx.canvas);
        resolve(undefined);
      }, 50);
      });

    await new Promise((resolve) => {
      setTimeout(() => {
        this.flowChartEl.options.responsive = true;
        this.flowChartEl.update('quite');
        resolve(undefined);
      }, 50);
    });

    await new Promise((resolve) => {
      // Looks funny but we need. if we would not calculate and substract 25px, the actual time graph would not be displayed :<
      setTimeout(() => {
        const el =  this.flowContent.nativeElement;
        this.flowChartEl.ctx.canvas.style.height = (el.offsetHeight - 25) + 'px';

        resolve(undefined);
      }, 25);
    });





    if (this.isDetail===false) {
      this.brewFlowGraphSubscription = this.brewFlowGraphEvent.subscribe((_val) => {
        this.setActualScaleInformation(_val);
      });

      const settings: Settings = this.uiSettingsStorage.getSettings();

      this.showBloomTimer = this.uiBrewHelper.fieldVisible(settings.manage_parameters.coffee_blooming_time,
        this.brew.getPreparation().manage_parameters.coffee_blooming_time,
        this.brew.getPreparation().use_custom_parameters);

      this.showDripTimer = (this.uiBrewHelper.fieldVisible(settings.manage_parameters.coffee_first_drip_time,
        this.brew.getPreparation().manage_parameters.coffee_first_drip_time,
        this.brew.getPreparation().use_custom_parameters) && this.brew.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO);
      }
  }

  public startTimer() {
    this.brewComponent.timer.startTimer();
  }
  public pauseTimer() {
    this.brewComponent.timer.pauseTimer();
  }
  public resetTimer() {
    this.brewComponent.timer.reset();
  }
  public resumeTimer() {
    this.brewComponent.timer.resumeTimer();
  }
  public __tareScale() {
    this.brewComponent.timer.__tareScale();
  }

  public setCoffeeDripTime (): void {

    this.brew.coffee_first_drip_time = this.brew.brew_time;
    this.showDripTimer = false;
  }

  public setCoffeeBloomingTime (): void {
    this.brew.coffee_blooming_time = this.brew.brew_time;
    this.showBloomTimer = false;
  }

  public setActualScaleInformation (_val: any) {
    const weightEl = this.smartScaleWeightEl.nativeElement;
    const flowEl = this.smartScaleWeightPerSecondEl.nativeElement;
    const avgFlowEl = this.smartScaleAvgFlowPerSecondEl.nativeElement;
    weightEl.textContent = _val.scaleWeight;
    flowEl.textContent = _val.smoothedWeight;
    avgFlowEl.textContent = _val.avgFlow;
  }

  public ngOnDestroy() {
    if (this.brewFlowGraphSubscription) {
      this.brewFlowGraphSubscription.unsubscribe();
      this.brewFlowGraphSubscription = undefined;
    }

    this.flowChartEl.maintainAspectRatio = false;
    this.flowChartEl.update();

  }


}
