import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ModalController, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Brew } from '../../../classes/brew/brew';
import { UIHelper } from '../../../services/uiHelper';
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { Settings } from '../../../classes/settings/settings';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { TranslateService } from '@ngx-translate/core';
import {
  CoffeeBluetoothDevicesService,
  PressureDevice,
} from '@graphefruit/coffee-bluetooth-devices';

@Component({
  selector: 'brew-flow',
  templateUrl: './brew-flow.component.html',
  styleUrls: ['./brew-flow.component.scss'],
})
export class BrewFlowComponent implements AfterViewInit, OnDestroy {
  public static COMPONENT_ID: string = 'brew-flow';
  @ViewChild('smartScaleWeight', { read: ElementRef })
  public smartScaleWeightEl: ElementRef;
  @ViewChild('smartScaleWeightPerSecond', { read: ElementRef })
  public smartScaleWeightPerSecondEl: ElementRef;
  @ViewChild('smartScaleAvgFlowPerSecond', { read: ElementRef })
  public smartScaleAvgFlowPerSecondEl: ElementRef;
  public showBloomTimer: boolean = false;
  public showDripTimer: boolean = false;
  public gaugeVisible: boolean = false;
  @Input() public flowChart: any;
  @Input() public flowChartEl: any;
  @Input() private brewFlowGraphEvent: EventEmitter<any>;
  @Input() private brewPressureGraphEvent: EventEmitter<any>;

  @Input() public brew: Brew;
  @Input() public brewComponent: BrewBrewingComponent;
  @Input() public isDetail: boolean = false;
  private brewFlowGraphSubscription: Subscription;
  private brewPressureGraphSubscription: Subscription;

  public settings: Settings;

  public gaugeType = 'semi';
  public gaugeValue = 0;
  public gaugeLabel = '';
  public gaugeSize = 50;

  constructor(
    private readonly modalController: ModalController,
    private readonly screenOrientation: ScreenOrientation,
    private readonly uiHelper: UIHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly translate: TranslateService,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly platform: Platform
  ) {}

  public async ngAfterViewInit() {
    this.settings = this.uiSettingsStorage.getSettings();
    this.flowChartEl.options.responsive = false;
    this.flowChartEl.update('quite');

    setTimeout(() => {
      const offsetWidth = document.getElementById('brewPanel').offsetWidth;

      // -16 because of padding
      this.gaugeSize = offsetWidth - 16;
    }, 1000);

    this.gaugeLabel = this.translate.instant('BREW_PRESSURE_FLOW');
    await new Promise((resolve) => {
      setTimeout(() => {
        document
          .getElementById('brewFlowContainer')
          .append(this.flowChartEl.ctx.canvas);
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
        const newHeight =
          document.getElementById('brewFlowContainer').offsetHeight;
        this.flowChartEl.ctx.canvas.style.height = newHeight - 1 + 'px';

        resolve(undefined);
      }, 100);
    });

    if (this.isDetail === false) {
      this.brewFlowGraphSubscription = this.brewFlowGraphEvent.subscribe(
        (_val) => {
          this.setActualScaleInformation(_val);
        }
      );
      this.brewPressureGraphSubscription =
        this.brewPressureGraphEvent.subscribe((_val) => {
          this.setActualPressureInformation(_val);
        });

      const settings: Settings = this.uiSettingsStorage.getSettings();

      this.showBloomTimer = this.uiBrewHelper.fieldVisible(
        settings.manage_parameters.coffee_blooming_time,
        this.brew.getPreparation().manage_parameters.coffee_blooming_time,
        this.brew.getPreparation().use_custom_parameters
      );

      this.showDripTimer =
        this.uiBrewHelper.fieldVisible(
          settings.manage_parameters.coffee_first_drip_time,
          this.brew.getPreparation().manage_parameters.coffee_first_drip_time,
          this.brew.getPreparation().use_custom_parameters
        ) &&
        this.brew.getPreparation().style_type ===
          PREPARATION_STYLE_TYPE.ESPRESSO;
    }
  }
  public pressureDeviceConnected() {
    if (!this.platform.is('cordova')) {
      return true;
    }

    const pressureDevice: PressureDevice = this.bleManager.getPressureDevice();
    return !!pressureDevice;
  }
  public async startTimer() {
    await this.brewComponent.timerStartPressed(undefined);

    // Looks funny but we need. if we would not calculate and substract 25px, the actual time graph would not be displayed :<
    setTimeout(() => {
      try {
        const newHeight =
          document.getElementById('brewFlowContainer').offsetHeight;
        document
          .getElementById('brewFlowContainer')
          .getElementsByTagName('canvas')[0].style.height =
          newHeight - 1 + 'px';
      } catch (ex) {}
    }, 250);
  }
  public pauseTimer() {
    this.brewComponent.timer.pauseTimer();
  }
  public resetTimer() {
    this.brewComponent.timer.reset();
  }
  public resumeTimer() {
    this.brewComponent.timerResumedPressed(undefined);
  }
  public __tareScale() {
    this.brewComponent.timer.__tareScale();
  }

  public setCoffeeDripTime(): void {
    this.brew.coffee_first_drip_time = this.brew.brew_time;
    this.showDripTimer = false;
  }

  public setCoffeeBloomingTime(): void {
    this.brew.coffee_blooming_time = this.brew.brew_time;
    this.showBloomTimer = false;
  }

  public setActualScaleInformation(_val: any) {
    const weightEl = this.smartScaleWeightEl.nativeElement;
    const flowEl = this.smartScaleWeightPerSecondEl.nativeElement;
    const avgFlowEl = this.smartScaleAvgFlowPerSecondEl.nativeElement;
    weightEl.textContent = _val.scaleWeight;
    flowEl.textContent = _val.smoothedWeight;
    avgFlowEl.textContent = _val.avgFlow;
  }

  public setActualPressureInformation(_val: any) {
    this.gaugeValue = _val.pressure;
  }

  public ngOnDestroy() {
    if (this.brewFlowGraphSubscription) {
      this.brewFlowGraphSubscription.unsubscribe();
      this.brewFlowGraphSubscription = undefined;
    }
    if (this.brewPressureGraphSubscription) {
      this.brewPressureGraphSubscription.unsubscribe();
      this.brewPressureGraphSubscription = undefined;
    }

    this.flowChartEl.maintainAspectRatio = false;
    this.flowChartEl.update('quite');
  }

  public resetPressure() {
    if (this.pressureDeviceConnected()) {
      const pressureDevice: PressureDevice =
        this.bleManager.getPressureDevice();
      try {
        pressureDevice.updateZero();
      } catch (ex) {}
    }
  }
  public dismiss() {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewFlowComponent.COMPONENT_ID
    );
  }
}
