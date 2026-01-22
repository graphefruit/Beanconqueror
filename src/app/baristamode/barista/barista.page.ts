import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonMenuButton,
  IonRow,
  ModalController,
  Platform,
} from '@ionic/angular/standalone';

import { App } from '@capacitor/app';
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { Brew } from '../../../classes/brew/brew';
import { BluetoothScale, BluetoothTypes } from '../../../classes/devices';
import { Preparation } from '../../../classes/preparation/preparation';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { SanremoYOUDevice } from '../../../classes/preparationDevice/sanremo/sanremoYOUDevice';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { HeaderButtonComponent } from '../../../components/header/header-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { LongPressDirective } from '../../../directive/long-press.directive';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { BluetoothDeviceChooserPopoverComponent } from '../../../popover/bluetooth-device-chooser-popover/bluetooth-device-chooser-popover.component';
import {
  CoffeeBluetoothDevicesService,
  CoffeeBluetoothServiceEvent,
} from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { SettingsPopoverBluetoothActionsComponent } from '../../settings/settings-popover-bluetooth-actions/settings-popover-bluetooth-actions.component';

declare var Plotly;
@Component({
  selector: 'app-barista',
  templateUrl: './barista.page.html',
  styleUrls: ['./barista.page.scss'],
  imports: [
    LongPressDirective,
    BrewBrewingComponent,
    TranslatePipe,
    IonHeader,
    IonMenuButton,
    IonChip,
    IonIcon,
    IonButton,
    IonContent,
    IonCard,
    IonCardContent,
    IonGrid,
    IonRow,
    IonCol,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    HeaderComponent,
    HeaderButtonComponent,
  ],
})
export class BaristaPage implements OnInit, OnDestroy {
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly platform = inject(Platform);
  private readonly bleManager = inject(CoffeeBluetoothDevicesService);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiHelper = inject(UIHelper);
  private readonly ngZone = inject(NgZone);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly modalController = inject(ModalController);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly uiAlert = inject(UIAlert);

  public data: Brew = new Brew();

  @ViewChild('ionHeader', { read: ElementRef, static: true })
  public ionHeader: ElementRef;
  @ViewChild('ionContent', { read: ElementRef, static: true })
  public ionContent: ElementRef;
  @ViewChild('brewBrewing', { read: BrewBrewingComponent, static: false })
  public brewBrewing: BrewBrewingComponent;

  @ViewChild('devInformation', { read: ElementRef, static: false })
  public devInformationEl: ElementRef;

  private scaleFlowChangeSubscription: Subscription = undefined;
  public bluetoothSubscription: Subscription = undefined;

  private debugInformationIntv = undefined;

  public lastHeartbeat: string = '';
  @ViewChild('lastHeartBeat', { read: ElementRef })
  public lastHeartBeatEl: ElementRef;

  @ViewChild('lagTimeP1', { read: ElementRef })
  public lagTimeP1El: ElementRef;

  @ViewChild('lagTimeP2', { read: ElementRef })
  public lagTimeP2El: ElementRef;

  @ViewChild('lagTimeP3', { read: ElementRef })
  public lagTimeP3El: ElementRef;

  @ViewChild('lagTimeM', { read: ElementRef })
  public lagTimeMEl: ElementRef;

  @ViewChild('currentTemp', { read: ElementRef })
  public currentTempEl: ElementRef;

  @ViewChild('pumpPress', { read: ElementRef })
  public pumpPressEl: ElementRef;

  @Output() public lastShot = new EventEmitter();

  constructor() {
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
  }

  async ngOnInit() {
    this.uiHelper.deviceKeepAwake();

    if (this.platform.is('capacitor')) {
      await this.checkIfScaleIsConnected();
    }

    this.__connectSmartScale(false);
    this.bluetoothSubscription = this.bleManager
      .attachOnEvent()
      .subscribe((_type) => {
        let disconnectTriggered: boolean = false;
        let connectTriggered: boolean = false;

        if (_type === CoffeeBluetoothServiceEvent.CONNECTED_SCALE) {
          connectTriggered = true;
          this.__connectSmartScale(false);
          this.changeDetectorRef.detectChanges();
        } else if (_type === CoffeeBluetoothServiceEvent.DISCONNECTED_SCALE) {
          this.deattachToFlowChange();

          disconnectTriggered = true;
          this.changeDetectorRef.detectChanges();
        }
      });

    /**setTimeout(() => {
          this.checkSanremoYOUDoses();
        }, 2000);**/

    setTimeout(() => {
      this.resizeGraph();
    }, 1000);
    setTimeout(() => {
      this.showLagTime();

      this.checkIfHintShallBeShown();
    }, 5000);

    let updateSanremoYouTicker = 0;
    this.debugInformationIntv = setInterval(() => {
      try {
        if (this.isWebSocketConnected()) {
          const shotData = (
            this.brewBrewing?.brewBrewingPreparationDeviceEl
              ?.preparationDevice as SanremoYOUDevice
          ).getActualShotData();

          this.lastHeartbeat = shotData.localTimeString;
          this.lastHeartBeatEl.nativeElement.innerText = this.lastHeartbeat;
          this.currentTempEl.nativeElement.innerText = shotData.tempBoilerCoffe;
          this.pumpPressEl.nativeElement.innerText = shotData.pumpPress;

          if (shotData.groupStatus === 0) {
            updateSanremoYouTicker++;
            if (updateSanremoYouTicker >= 5) {
              //We use an update ticker to update just every 5 ticks (so every 5 seconds, we don't want to use another interval)
              //We're not doing any shot right now
              this.updateSanremoYOUDoses();
              updateSanremoYouTicker = 0;
            }
          } else {
            //Reset the timer
            updateSanremoYouTicker = 0;
          }
        }
      } catch (ex) {
        this.lastHeartBeatEl.nativeElement.innerText = '-';
        this.currentTempEl.nativeElement.innerText = '-';
        this.pumpPressEl.nativeElement.innerText = '-';
      }
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
  @HostListener('window:orientationchange')
  public onOrientationChange() {
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
      let chartHeight = totalHeight - (offsetTopOfGraph + 85);
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
        const actualScaleValue: number = _val.actual;
        lastScaleValues.push(actualScaleValue);
        if (lastScaleValues.length > maxHistory) {
          lastScaleValues.shift(); // Keep only the last 4 values
        }
        if (this.brewBrewing?.timer) {
          let actualSeconds = this.brewBrewing.timer.getSeconds();
          if (this.brewBrewing.timer.isTimerRunning() === true) {
            // We are brewing

            if (actualSeconds >= 0 && actualSeconds <= 6) {
              if (lastScaleValues.length >= maxHistory) {
                const thresholdChange = lastScaleValues[3] - lastScaleValues[0];
                if (
                  thresholdChange >= -0.5 &&
                  thresholdChange <= 0.5 &&
                  (lastScaleValues[3] < -2 || lastScaleValues[3] > 100)
                ) {
                  // Cup was lifted

                  this.checkTimeframeTare(scale);
                  lastScaleValues = []; // Reset after taring
                }
              }
            }
          } else {
            //We don't tare anymore if a shot is stopped, so users can weight beans or something like this.
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
    if (this.debugInformationIntv) {
      window.clearInterval(this.debugInformationIntv);
      this.debugInformationIntv = undefined;
    }

    this.uiHelper.deviceAllowSleepAgain();

    (
      this.brewBrewing?.brewBrewingPreparationDeviceEl
        ?.preparationDevice as SanremoYOUDevice
    )?.disconnectSocket();

    /**Ok, this is a very strange issue, somehow if we swapped out
     *  from the barista mode and swapped in again, the timer was not destroyed and kept running... so we delete the whole element with the references...
     *  This may even come from, because I wrote a for loop wrongly...*/
    this.brewBrewing.ngOnDestroy();
    delete this.brewBrewing;
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

  public lastShotInformation(_data) {
    this.showLagTime();
    /**
        this.lastShotWeight.nativeElement.innerHTML = _data.shotWeight;
        this.lastShotFlow.nativeElement.innerHTML = 'Ø ' + _data.avgFlow + ' g/s';
        this.lastShotBrewTime.nativeElement.innerHTML = _data.brewtime;**/
  }
  private showLagTime() {
    const device = this.brewBrewing?.brewBrewingPreparationDeviceEl
      ?.preparationDevice as SanremoYOUDevice;
    if (device) {
      const lagTimeP1 = device.getResidualLagTimeByProgram(1);
      const lagTimeP2 = device.getResidualLagTimeByProgram(2);
      const lagTimeP3 = device.getResidualLagTimeByProgram(3);
      const lagTimeM = device.getResidualLagTimeByProgram(4);

      this.lagTimeP1El.nativeElement.innerHTML = lagTimeP1;
      this.lagTimeP2El.nativeElement.innerHTML = lagTimeP2;
      this.lagTimeP3El.nativeElement.innerHTML = lagTimeP3;
      this.lagTimeMEl.nativeElement.innerHTML = lagTimeM;
    }
  }

  public async popoverActionsBrew() {
    const popover = await this.modalController.create({
      component: SettingsPopoverBluetoothActionsComponent,
      componentProps: {},
      id: SettingsPopoverBluetoothActionsComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.5],
      initialBreakpoint: 0.5,
    });
    await popover.present();
    await popover.onWillDismiss();
  }

  public async toggleDevInformation() {
    if (this.devInformationEl.nativeElement.style.display === 'block') {
      this.devInformationEl.nativeElement.style.display = 'none';
    } else {
      this.devInformationEl.nativeElement.style.display = 'block';
    }
  }
  public async showPreparationEdit() {
    const preparation: Preparation = this.data.getPreparation();
    await this.uiPreparationHelper.connectDevice(preparation);
  }

  private async checkIfHintShallBeShown() {
    if (this.isSanremoConnected()) {
      const device = this.brewBrewing?.brewBrewingPreparationDeviceEl
        ?.preparationDevice as SanremoYOUDevice;
      if (device.showInformationHintForBrewByWeightMode()) {
        //We got no scale, so ask user to connect one.
        try {
          await this.uiAlert.showConfirmWithYesNoTranslation(
            'PREPARATION_DEVICE.TYPE_SANREMO_YOU.BREW_BY_WEIGHT_HINT',
            'INFORMATION',
            'DONT_SHOW_AGAIN',
            'SKIP',
            true,
          );

          await this.brewBrewing?.brewBrewingPreparationDeviceEl.setBaristaHintHasBeenShown();

          //Barista pressed don't show again.
        } catch (ex) {
          //Skip was pressed
        }
      } else {
        //Nothing to do we already showed it
      }
    }
  }

  private async checkIfScaleIsConnected() {
    const checkDevices = this.uiSettingsStorage.getSettings();
    const scale_id: string = checkDevices.scale_id;
    if (scale_id) {
      //We got an scale, just needs to be connected
    } else {
      //We got no scale, so ask user to connect one.
      await this.uiAlert.showMessage(
        'PREPARATION_DEVICE.TYPE_SANREMO_YOU.NO_SCALE_CONNECTED_PLEASE_CONNECT_ONE',
        undefined,
        undefined,
        true,
      );
      await this.connectDevice(BluetoothTypes.SCALE);
    }
  }
  public async connectDevice(_type: BluetoothTypes) {
    const modal = await this.modalController.create({
      component: BluetoothDeviceChooserPopoverComponent,
      id: BluetoothDeviceChooserPopoverComponent.POPOVER_ID,
      componentProps: { bluetoothTypeSearch: _type },
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  private async updateSanremoYOUDoses() {
    if (this.isSanremoConnected()) {
      const device = this.brewBrewing?.brewBrewingPreparationDeviceEl
        ?.preparationDevice as SanremoYOUDevice;

      // Because the device initialization might take some time or connection might be established later,
      // we ensure we have a device instance.
      if (!device) {
        return;
      }

      const doses = await device.getDoses();

      if (doses) {
        const keysToCheck = ['key1', 'key2', 'key3'];

        for (const key of keysToCheck) {
          document.getElementById('sanremo_dose_' + key).innerText =
            doses[key] + ' ml';
        }
      }
    }
  }

  protected readonly PreparationDeviceType = PreparationDeviceType;
}

export default BaristaPage;
