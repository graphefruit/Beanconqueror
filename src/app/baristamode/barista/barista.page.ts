import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Brew } from '../../../classes/brew/brew';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { Subscription } from 'rxjs';
import { Settings } from '../../../classes/settings/settings';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { Platform } from '@ionic/angular';
import {
  CoffeeBluetoothDevicesService,
  CoffeeBluetoothServiceEvent,
} from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIHelper } from '../../../services/uiHelper';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { SanremoYOUDevice } from '../../../classes/preparationDevice/sanremo/sanremoYOUDevice';
import { BluetoothScale } from '../../../classes/devices';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { App } from '@capacitor/app';

declare var Plotly;
@Component({
  selector: 'app-barista',
  templateUrl: './barista.page.html',
  styleUrls: ['./barista.page.scss'],
})
export class BaristaPage implements OnInit {
  public data: Brew = new Brew();

  @ViewChild('ionHeader', { read: ElementRef, static: true })
  public ionHeader: ElementRef;
  @ViewChild('ionContent', { read: ElementRef, static: true })
  public ionContent: ElementRef;
  @ViewChild('brewBrewing', { read: BrewBrewingComponent, static: false })
  public brewBrewing: BrewBrewingComponent;
  private scaleFlowChangeSubscription: Subscription = undefined;
  public bluetoothSubscription: Subscription = undefined;

  private memIntv = undefined;

  constructor(
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiMillStorage: UIMillStorage,
    private readonly platform: Platform,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiHelper: UIHelper,
  ) {
    // Get first entry
    this.data.bean = this.uiBeanStorage
      .getAllEntries()
      .filter((bean) => !bean.finished)
      .sort((a, b) => a.name.localeCompare(b.name))[0]?.config?.uuid;

    this.data.method_of_preparation = this.uiPreparationStorage
      .getAllEntries()
      .filter(
        (e) =>
          !e.finished &&
          e.hasDeviceConnection() &&
          e.type === PREPARATION_TYPES.SANREMO_YOU,
      )[0]?.config?.uuid;

    this.data.mill = this.uiMillStorage
      .getAllEntries()
      .filter((e) => !e.finished)
      .sort((a, b) => a.name.localeCompare(b.name))[0]?.config?.uuid;

    this.__attachOnDeviceResume();

    this.memIntv = setInterval(() => {
      if (window['sanremoShotData']) {
        var freeMem = window['sanremoShotData'].freeMem;
        if (freeMem < 28000) {
          console.error(freeMem);
        } else {
          console.log(freeMem);
        }
      }
    }, 100);
  }

  ngOnInit() {
    this.uiHelper.deviceKeepAwake();

    this.__connectSmartScale(false);
    this.bluetoothSubscription = this.bleManager
      .attachOnEvent()
      .subscribe((_type) => {
        let disconnectTriggered: boolean = false;
        let connectTriggered: boolean = false;

        if (_type === CoffeeBluetoothServiceEvent.CONNECTED_SCALE) {
          connectTriggered = true;
          this.__connectSmartScale(false);
        } else if (_type === CoffeeBluetoothServiceEvent.DISCONNECTED_SCALE) {
          this.deattachToFlowChange();

          disconnectTriggered = true;
        }
      });

    setTimeout(() => {
      this.resizeGraph();
    }, 1000);
  }

  public isWebSocketConnected() {
    return (
      this.brewBrewing?.brewBrewingPreparationDeviceEl
        ?.preparationDevice as SanremoYOUDevice
    )?.isConnected();
  }

  public isSanremoConnected() {
    return (
      (this.brewBrewing?.brewBrewingPreparationDeviceEl
        ?.preparationDevice as SanremoYOUDevice) !== undefined
    );
  }
  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(event) {
    setTimeout(() => {
      this.resizeGraph();
    }, 150);
  }
  public resizeGraph() {
    try {
      const totalHeight = this.ionContent.nativeElement.offsetHeight;
      const offsetTopOfGraph =
        this.brewBrewing.brewBrewingGraphEl.canvaContainer.nativeElement
          .offsetTop;

      const chartWidth =
        this.brewBrewing.brewBrewingGraphEl.canvaContainer.nativeElement
          .offsetWidth;
      let chartHeight = totalHeight - (offsetTopOfGraph + 75 + 75 + 75);
      if (chartHeight <= 100) {
        chartHeight = 100;
      }
      this.brewBrewing.brewBrewingGraphEl.lastChartLayout.height = chartHeight;

      this.brewBrewing.brewBrewingGraphEl.lastChartLayout.width = chartWidth;
      Plotly.relayout(
        this.brewBrewing.brewBrewingGraphEl.profileDiv.nativeElement,
        this.brewBrewing.brewBrewingGraphEl.lastChartLayout,
      );
      // Re render, else the lines would not be hidden/shown when having references graphs
    } catch (ex) {}
  }

  public smartScaleConnected() {
    if (!this.platform.is('capacitor')) {
      return true;
    }

    const scale: BluetoothScale = this.bleManager.getScale();
    return !!scale;
  }

  private async __connectSmartScale(_firstStart: boolean) {
    if (this.smartScaleConnected()) {
      // Always attach flow.
      this.attachToFlowChange();

      setTimeout(() => {
        this.resizeGraph();
      }, 350);
    }
  }
  public attachToFlowChange() {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      this.deattachToFlowChange();

      let lastScaleValues: number[] = [];
      let maxHistory: number = 4;
      this.scaleFlowChangeSubscription = scale.flowChange.subscribe((_val) => {
        if (this.brewBrewing?.timer) {
          let actualSeconds = this.brewBrewing.timer.getSeconds();
          if (this.brewBrewing.timer.isTimerRunning() === true) {
            // We are brewing

            if (actualSeconds >= 0 && actualSeconds <= 6) {
              if (_val.actual < 0 || _val.actual > 100) {
                // Cup was lifted
                this.checkTimeframeTare(scale);
              }
            }
          } else {
            let actualScaleValue: number = _val.actual;
            lastScaleValues.push(actualScaleValue);
            if (lastScaleValues.length > maxHistory) {
              lastScaleValues.shift(); // Keep only the last 4 values
            }

            if (lastScaleValues.length === maxHistory) {
              const allSame = lastScaleValues.every(
                (v) => v === lastScaleValues[0],
              );
              if (this.brewBrewing.timer.getSeconds() > 0) {
                //We did a shot, check when the cup gets lifted.
                if (lastScaleValues[0] < 0) {
                  //Cup was lifted
                  this.checkTimeframeTare(scale);

                  this.brewBrewing.timer.reset();
                }
              } else {
                //We are in the preparation phase
                if (lastScaleValues[0] !== 0) {
                  //Just tare if scale is not zero
                  if (allSame) {
                    this.checkTimeframeTare(scale);
                  }
                }
              }

              lastScaleValues = []; // Reset after taring
            }
          }
        }
      });
    }
  }

  public tareingTimestamp = 0;

  private checkTimeframeTare(_scale: BluetoothScale) {
    if (Date.now() - this.tareingTimestamp < 1000) {
      return;
    } else {
      _scale.tare();
    }
    this.tareingTimestamp = Date.now();
  }

  public deattachToFlowChange() {
    if (this.scaleFlowChangeSubscription) {
      this.scaleFlowChangeSubscription.unsubscribe();
      this.scaleFlowChangeSubscription = undefined;
    }
  }

  public ngOnDestroy() {
    if (this.memIntv) {
      window.clearInterval(this.memIntv);
    }

    this.uiHelper.deviceAllowSleepAgain();

    (
      this.brewBrewing?.brewBrewingPreparationDeviceEl
        ?.preparationDevice as SanremoYOUDevice
    )?.disconnectSocket();
  }
  private __attachOnDeviceResume() {
    App.addListener('resume', async () => {
      /** setTimeout(() => {
        this.checkIfSanremoIsStillConnectedElseShowUpAReconnectButton();
      },5000);**/
    });
  }

  public async checkIfSanremoIsStillConnectedElseShowUpAReconnectButton() {
    if (this.isSanremoConnected() === false) {
      await this.brewBrewing?.brewBrewingPreparationDeviceEl?.instancePreparationDevice();
    }
    if (this.isWebSocketConnected() !== true) {
      return (
        this.brewBrewing?.brewBrewingPreparationDeviceEl
          ?.preparationDevice as SanremoYOUDevice
      )?.reconnectToSocket();
    }
  }

  protected readonly PreparationDeviceType = PreparationDeviceType;
}
