import { Component, OnInit, ViewChild } from '@angular/core';
import { Brew } from '../../classes/brew/brew';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UIMillStorage } from '../../services/uiMillStorage';
import { BrewBrewingComponent } from '../../components/brews/brew-brewing/brew-brewing.component';

import { PREPARATION_TYPES } from '../../enums/preparations/preparationTypes';
import { BluetoothScale, SCALE_TIMER_COMMAND } from '../../classes/devices';
import { Platform } from '@ionic/angular';
import {
  CoffeeBluetoothDevicesService,
  CoffeeBluetoothServiceEvent,
} from '../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { Subscription } from 'rxjs';
declare var Plotly;
@Component({
  selector: 'app-baristamode',
  templateUrl: './baristamode.page.html',
  styleUrls: ['./baristamode.page.scss'],
})
export class BaristamodePage implements OnInit {
  public data: Brew = new Brew();

  @ViewChild('brewBrewing', { read: BrewBrewingComponent, static: false })
  public brewBrewing: BrewBrewingComponent;
  private scaleFlowChangeSubscription: Subscription = undefined;
  public bluetoothSubscription: Subscription = undefined;

  constructor(
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiMillStorage: UIMillStorage,
    private readonly platform: Platform,
    private readonly bleManager: CoffeeBluetoothDevicesService,
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
  }

  ngOnInit() {
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
  }

  public resizeIfNeeded() {
    this.brewBrewing.brewBrewingGraphEl.lastChartLayout.height = 100;

    this.brewBrewing.brewBrewingGraphEl.lastChartLayout.width = 500;
    Plotly.relayout(
      this.brewBrewing.brewBrewingGraphEl.profileDiv.nativeElement,
      this.brewBrewing.brewBrewingGraphEl.lastChartLayout,
    );
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
      const scale: BluetoothScale = this.bleManager.getScale();
      // Always attach flow.
      this.attachToFlowChange();
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
          if (this.brewBrewing.timer.isTimerRunning() === true) {
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
                  scale.tare();

                  this.brewBrewing.timer.reset();
                }
              } else {
                //We are in the preparation phase
                if (lastScaleValues[0] !== 0) {
                  //Just tare if scale is not zero
                  if (allSame) {
                    scale.tare();
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

  private checkAndTare() {}

  public deattachToFlowChange() {
    if (this.scaleFlowChangeSubscription) {
      this.scaleFlowChangeSubscription.unsubscribe();
      this.scaleFlowChangeSubscription = undefined;
    }
  }
}
