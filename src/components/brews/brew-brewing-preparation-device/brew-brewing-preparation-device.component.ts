import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { Brew } from '../../../classes/brew/brew';
import { PreparationDevice } from '../../../classes/preparationDevice/preparationDevice';
import {
  XeniaDevice,
  XeniaParams,
} from '../../../classes/preparationDevice/xenia/xeniaDevice';
import {
  MeticulousDevice,
  MeticulousParams,
} from '../../../classes/preparationDevice/meticulous/meticulousDevice';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { BrewBrewingComponent } from '../brew-brewing/brew-brewing.component';
import { UIAlert } from '../../../services/uiAlert';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UIToast } from '../../../services/uiToast';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { Preparation } from '../../../classes/preparation/preparation';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import moment from 'moment';
import {
  BrewFlow,
  IBrewPressureFlow,
  IBrewRealtimeWaterFlow,
  IBrewTemperatureFlow,
  IBrewWeightFlow,
} from '../../../classes/brew/brewFlow';
@Component({
  selector: 'brew-brewing-preparation-device',
  templateUrl: './brew-brewing-preparation-device.component.html',
  styleUrls: ['./brew-brewing-preparation-device.component.scss'],
})
export class BrewBrewingPreparationDeviceComponent implements OnInit {
  @Input() public data: Brew;
  @Input() public isEdit: boolean = false;
  @Output() public dataChange = new EventEmitter<Brew>();
  @Input() public brewComponent: BrewBrewingComponent;
  public preparationDevice: XeniaDevice | MeticulousDevice = undefined;

  public preparation: Preparation = undefined;
  public settings: Settings = undefined;
  public PREPARATION_DEVICE_TYPE_ENUM = PreparationDeviceType;
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public customXeniaOptions = {
    cssClass: 'xenia-script-chooser',
  };

  constructor(
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly uiAlert: UIAlert,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiToast: UIToast,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public getPreparation(): Preparation {
    return this.uiPreparationStorage.getByUUID(this.data.method_of_preparation);
  }

  public async instance() {
    if (this.isEdit) {
      await this.instancePreparationDevice(this.data);
    }
  }

  public hasAPreparationDeviceSet() {
    return (
      this.preparation?.connectedPreparationDevice.type !==
      PreparationDeviceType.NONE
    );
  }

  public getDataPreparationDeviceType() {
    return this.preparation?.connectedPreparationDevice.type;
  }

  public async instancePreparationDevice(_brew: Brew = null) {
    this.preparation = this.data.getPreparation();
    const connectedDevice: PreparationDevice =
      this.uiPreparationHelper.getConnectedDevice(this.preparation);
    if (connectedDevice) {
      if (connectedDevice instanceof XeniaDevice) {
        await this.instanceXeniaPreparationDevice(connectedDevice, _brew);
      } else if (connectedDevice instanceof MeticulousDevice) {
        await this.instanceMeticulousPreparationDevice(connectedDevice, _brew);
      }
      this.checkChanges();
    } else {
      this.preparationDevice = undefined;
    }
  }
  private async instanceXeniaPreparationDevice(
    connectedDevice: PreparationDevice,
    _brew: Brew = null
  ) {
    let preparationDeviceNotConnected: boolean = false;
    try {
      await this.uiAlert.showLoadingSpinner(
        'PREPARATION_DEVICE.TYPE_XENIA.CHECKING_CONNECTION_TO_PORTAFILTER'
      );
      await connectedDevice.deviceConnected().then(
        () => {
          // No popup needed
        },
        () => {
          preparationDeviceNotConnected = true;
          this.uiAlert.showMessage(
            'PREPARATION_DEVICE.TYPE_XENIA.ERROR_CONNECTION_COULD_NOT_BE_ESTABLISHED',
            'ERROR_OCCURED',
            undefined,
            true
          );
        }
      );
      if (preparationDeviceNotConnected) {
        await this.uiAlert.hideLoadingSpinner();
        this.preparationDevice = undefined;
        return;
      }
    } catch (ex) {}

    if (this.brewComponent.timer.isTimerRunning()) {
      //If timer is running, we need to stop, else scripts would get execute which would get realy bad in the end :O
      this.brewComponent.timer.pauseTimer();
    }
    this.preparationDevice = connectedDevice as XeniaDevice;
    await this.uiAlert.setLoadingSpinnerMessage(
      'PREPARATION_DEVICE.TYPE_XENIA.GRABING_SCRIPTS',
      true
    );
    try {
      try {
        const xeniaScripts = await this.preparationDevice.getScripts();
        this.preparationDevice.mapScriptsAndSaveTemp(xeniaScripts);
      } catch (ex) {
        this.uiToast.showInfoToast(
          'We could not get scripts from xenia: ' + JSON.stringify(ex),
          false
        );
      }
      // We didn't set any data yet
      if (this.data.preparationDeviceBrew.type === PreparationDeviceType.NONE) {
        if (!this.isEdit) {
          // If a brew was passed, we came from loading, else we just swapped the preparation toolings
          let wasSomethingSet: boolean = false;
          if (_brew) {
            if (
              _brew.preparationDeviceBrew.type !== PreparationDeviceType.NONE
            ) {
              this.data.preparationDeviceBrew = this.uiHelper.cloneData(
                _brew.preparationDeviceBrew
              );
              wasSomethingSet = true;
            }
          }

          if (wasSomethingSet === false) {
            // maybe the passed brew, didn't had any params in it - why ever?!
            // Is add
            const brews: Array<Brew> = this.uiHelper
              .cloneData(this.uiBrewStorage.getAllEntries())
              .reverse();
            if (brews.length > 0) {
              const foundEntry = brews.find(
                (b) =>
                  b.preparationDeviceBrew.type !== PreparationDeviceType.NONE
              );
              if (foundEntry) {
                this.data.preparationDeviceBrew = this.uiHelper.cloneData(
                  foundEntry.preparationDeviceBrew
                );
                wasSomethingSet = true;
              }
            }
          }

          if (wasSomethingSet) {
            if (
              this.data.preparationDeviceBrew.params === undefined ||
              this.data.preparationDeviceBrew.params === null
            ) {
              //Something completly broke. reset.
              this.data.preparationDeviceBrew.params = new XeniaParams();
            }
            //Check if all scripts exists
            let isAScriptMissing: boolean = false;
            const xeniaParams: XeniaParams = this.data.preparationDeviceBrew
              .params as XeniaParams;
            if (
              xeniaParams.scriptStartId > 2 &&
              this.preparationDevice.scriptList.findIndex(
                (e) => e.INDEX === xeniaParams.scriptStartId
              ) === -1
            ) {
              // Script not found.
              this.data.preparationDeviceBrew.params.scriptStartId = 0;
              isAScriptMissing = true;
            }
            if (
              xeniaParams.scriptAtFirstDripId > 2 &&
              this.preparationDevice.scriptList.findIndex(
                (e) => e.INDEX === xeniaParams.scriptAtFirstDripId
              ) === -1
            ) {
              // Script not found.
              this.data.preparationDeviceBrew.params.scriptAtFirstDripId = 0;
              isAScriptMissing = true;
            }
            if (
              xeniaParams.scriptAtWeightReachedId > 2 &&
              this.preparationDevice.scriptList.findIndex(
                (e) => e.INDEX === xeniaParams.scriptAtWeightReachedId
              ) === -1
            ) {
              // Script not found.
              this.data.preparationDeviceBrew.params.scriptAtWeightReachedId = 0;
              isAScriptMissing = true;
            }
            if (isAScriptMissing) {
              this.uiAlert.showMessage(
                'PREPARATION_DEVICE.TYPE_XENIA.ERROR_NOT_ALL_SCRIPTS_FOUND',
                'CARE',
                undefined,
                true
              );
            }
          } else {
            this.data.preparationDeviceBrew.type = PreparationDeviceType.XENIA;
            this.data.preparationDeviceBrew.params = new XeniaParams();
            // Atleast set xenia, reset is not needed
          }
        }
      }
    } catch (ex) {}

    await this.uiAlert.hideLoadingSpinner();
  }

  public checkChanges() {
    // #507 Wrapping check changes in set timeout so all values get checked
    setTimeout(() => {
      this.changeDetectorRef.detectChanges();
      window.getComputedStyle(window.document.getElementsByTagName('body')[0]);
    }, 15);
  }

  private async disconnectMeticulousPreparationDevice() {
    const prepDevice: MeticulousDevice = this
      .preparationDevice as MeticulousDevice;
    prepDevice.disconnectSocket();
  }

  private async instanceMeticulousPreparationDevice(
    connectedDevice: MeticulousDevice,
    _brew: Brew = null
  ) {
    this.data.preparationDeviceBrew.type = PreparationDeviceType.METICULOUS;
    this.data.preparationDeviceBrew.params = new MeticulousParams();

    await connectedDevice.connectToSocket().then(
      async (_connected) => {
        if (_connected) {
          this.preparationDevice = connectedDevice as MeticulousDevice;
          this.preparationDevice.loadProfiles();

          const history = await this.preparationDevice.getHistory();
          this.readShot(history[0]);
        }
      },
      () => {
        //Should never trigger
      }
    );
  }

  private readShot(_historyData) {
    const newMoment = moment(new Date()).startOf('day');

    let firstDripTimeSet: boolean = false;
    const newBrewFlow = new BrewFlow();

    let seconds: number = 0;
    let milliseconds: number = 0;
    for (const entry of _historyData.data as any) {
      const shotEntry: any = entry.shot;
      const shotEntryTime = newMoment.clone().add('milliseconds', entry.time);
      const timestamp = shotEntryTime.format('HH:mm:ss.SSS');

      seconds = shotEntryTime.diff(newMoment, 'seconds');
      milliseconds = shotEntryTime.get('milliseconds');

      const realtimeWaterFlow: IBrewRealtimeWaterFlow =
        {} as IBrewRealtimeWaterFlow;

      realtimeWaterFlow.brew_time = '';
      realtimeWaterFlow.timestamp = timestamp;
      realtimeWaterFlow.smoothed_weight = 0;
      realtimeWaterFlow.flow_value = shotEntry.flow;
      realtimeWaterFlow.timestampdelta = 0;

      newBrewFlow.realtimeFlow.push(realtimeWaterFlow);

      const brewFlow: IBrewWeightFlow = {} as IBrewWeightFlow;
      brewFlow.timestamp = timestamp;
      brewFlow.brew_time = '';
      brewFlow.actual_weight = shotEntry.weight;
      brewFlow.old_weight = 0;
      brewFlow.actual_smoothed_weight = 0;
      brewFlow.old_smoothed_weight = 0;
      brewFlow.not_mutated_weight = 0;
      newBrewFlow.weight.push(brewFlow);

      if (shotEntry.weight > 0 && firstDripTimeSet === false) {
        firstDripTimeSet = true;

        this.brewComponent.brewFirstDripTime.setTime(seconds, milliseconds);
        this.brewComponent.brewFirstDripTime.changeEvent();
      }

      const pressureFlow: IBrewPressureFlow = {} as IBrewPressureFlow;
      pressureFlow.timestamp = timestamp;
      pressureFlow.brew_time = '';
      pressureFlow.actual_pressure = shotEntry.pressure;
      pressureFlow.old_pressure = 0;
      newBrewFlow.pressureFlow.push(pressureFlow);

      const temperatureFlow: IBrewTemperatureFlow = {} as IBrewTemperatureFlow;
      temperatureFlow.timestamp = timestamp;
      temperatureFlow.brew_time = '';
      temperatureFlow.actual_temperature = shotEntry.temperature;
      temperatureFlow.old_temperature = 0;
      newBrewFlow.temperatureFlow.push(temperatureFlow);
    }

    const lastEntry = newBrewFlow.weight[newBrewFlow.weight.length - 1];

    this.brewComponent.data.brew_beverage_quantity = lastEntry.actual_weight;

    this.brewComponent.timer.setTime(seconds, milliseconds);
    this.brewComponent.timer.changeEvent();

    this.brewComponent.brewBrewingGraphEl.flow_profile_raw = newBrewFlow;
    this.brewComponent.brewBrewingGraphEl.initializeFlowChart(true);
  }

  public getPreparationDeviceType() {
    if (this.preparationDevice instanceof XeniaDevice) {
      return PreparationDeviceType.XENIA;
    } else if (this.preparationDevice instanceof MeticulousDevice) {
      return PreparationDeviceType.METICULOUS;
    }
    return PreparationDeviceType.NONE;
  }

  public preparationDeviceConnected(): boolean {
    if (
      this.preparationDevice &&
      this.data.preparationDeviceBrew.type !== PreparationDeviceType.NONE
    ) {
      return true;
    }
    return false;
  }

  public checkXeniaScripts() {
    setTimeout(() => {
      if (this.data.preparationDeviceBrew.params.scriptStartId === 0) {
        this.data.preparationDeviceBrew.params.scriptAtFirstDripId = 0;
        this.data.preparationDeviceBrew.params.scriptAtWeightReachedId = 0;
      }
    }, 50);
  }
}
