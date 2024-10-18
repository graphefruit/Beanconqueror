import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { Brew } from '../../../classes/brew/brew';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { Settings } from '../../../classes/settings/settings';
import { ModalController, Platform } from '@ionic/angular';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { TranslateService } from '@ngx-translate/core';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { PressureDevice } from '../../../classes/devices/pressureBluetoothDevice';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';

@Component({
  selector: 'app-brew-maximize-controls',
  templateUrl: './brew-maximize-controls.component.html',
  styleUrls: ['./brew-maximize-controls.component.scss'],
})
export class BrewMaximizeControlsComponent
  implements AfterViewInit, OnDestroy, OnInit
{
  public static COMPONENT_ID: string = 'brew-maximize-controls';

  public showBloomTimer: boolean = false;
  public showDripTimer: boolean = false;

  @Input() public brew: Brew;
  @Input() public brewComponent: BrewBrewingComponent;

  public settings: Settings;

  private disableHardwareBack;
  protected readonly PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;

  constructor(
    private readonly modalController: ModalController,
    public readonly uiHelper: UIHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly platform: Platform
  ) {}
  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();

    try {
      this.disableHardwareBack = this.platform.backButton.subscribeWithPriority(
        9999,
        (processNextHandler) => {
          this.dismiss();
        }
      );
    } catch (ex) {}
  }

  public returnWantedDisplayFormat() {
    const showMinutes: boolean = true;
    let showHours: boolean = false;
    let showMilliseconds: boolean = false;
    if (this.brew.brew_time >= 3600) {
      showHours = true;
    }

    if (this.settings?.brew_milliseconds) {
      showMilliseconds = true;
    }

    let returnStr: string = '';
    if (showMilliseconds) {
      if (this.settings.brew_milliseconds_leading_digits === 3) {
        returnStr = '.SSS';
      } else if (this.settings.brew_milliseconds_leading_digits === 2) {
        returnStr = '.SS';
      } else {
        returnStr = '.S';
      }
    }
    if (showHours) {
      return 'H:mm:ss' + returnStr;
    } else if (showMinutes) {
      return 'mm:ss' + returnStr;
    } else {
      return 'ss' + returnStr;
    }
  }

  public async ngAfterViewInit() {
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
      this.brew.getPreparation().style_type === PREPARATION_STYLE_TYPE.ESPRESSO;
  }

  public pressureDeviceConnected() {
    if (!this.platform.is('capacitor')) {
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

  public setCoffeeDripTime(): void {
    this.brewComponent.setCoffeeDripTime(undefined);
    // this.brew.coffee_first_drip_time = this.brew.brew_time;

    this.showDripTimer = false;
  }

  public setCoffeeBloomingTime(): void {
    this.brewComponent.setCoffeeBloomingTime(undefined);
    // this.brew.coffee_blooming_time = this.brew.brew_time;
    this.showBloomTimer = false;
  }

  public async ngOnDestroy() {}

  public dismiss() {
    try {
      this.disableHardwareBack.unsubscribe();
    } catch (ex) {}
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewMaximizeControlsComponent.COMPONENT_ID
    );
  }
}
