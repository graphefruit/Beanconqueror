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
import { BrewModalImportShotMeticulousComponent } from '../../../app/brew/brew-modal-import-shot-meticulous/brew-modal-import-shot-meticulous.component';
import { ModalController } from '@ionic/angular';
import { HistoryListingEntry } from '@meticulous-home/espresso-api/dist/types';
import {
  SanremoYOUDevice,
  SanremoYOUParams,
} from '../../../classes/preparationDevice/sanremo/sanremoYOUDevice';
import { SanremoYOUMode } from '../../../enums/preparationDevice/sanremo/sanremoYOUMode';
import { TranslateService } from '@ngx-translate/core';
import {
  GaggiuinoDevice,
  GaggiuinoParams,
} from '../../../classes/preparationDevice/gaggiuino/gaggiuinoDevice';
import { BrewModalImportShotGaggiuinoComponent } from '../../../app/brew/brew-modal-import-shot-gaggiuino/brew-modal-import-shot-gaggiuino.component';
import { GaggiuinoShotData } from '../../../classes/preparationDevice/gaggiuino/gaggiuinoShotData';

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

  @Input() public baristamode: boolean = false;

  public preparationDevice:
    | XeniaDevice
    | MeticulousDevice
    | SanremoYOUDevice
    | GaggiuinoDevice = undefined;

  public preparation: Preparation = undefined;
  public settings: Settings = undefined;
  public PREPARATION_DEVICE_TYPE_ENUM = PreparationDeviceType;
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public customXeniaOptions = {
    cssClass: 'xenia-script-chooser',
  };

  public uiPreparationDeviceConnected: boolean = undefined;
  public uiPreparationDeviceType: PreparationDeviceType = undefined;
  public uiHasAPreparationDeviceSet: boolean = undefined;
  constructor(
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly uiAlert: UIAlert,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiToast: UIToast,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly modalController: ModalController,
    public readonly uiBrewHelper: UIBrewHelper,
    private readonly translate: TranslateService,
  ) {}

  public async baristaModeWeightChanged(_type: string) {
    if (_type === 'P1') {
      this.preparation.connectedPreparationDevice.customParams.stopAtWeightP1 =
        this.data.preparationDeviceBrew?.params.stopAtWeightP1;
    }
    if (_type === 'P2') {
      this.preparation.connectedPreparationDevice.customParams.stopAtWeightP2 =
        this.data.preparationDeviceBrew?.params.stopAtWeightP2;
    }
    if (_type === 'P3') {
      this.preparation.connectedPreparationDevice.customParams.stopAtWeightP3 =
        this.data.preparationDeviceBrew?.params.stopAtWeightP3;
    }
    if (_type === 'M') {
      this.preparation.connectedPreparationDevice.customParams.stopAtWeightM =
        this.data.preparationDeviceBrew?.params.stopAtWeightM;
    }
    await this.uiPreparationStorage.update(this.preparation);
  }

  private async setUIParams() {
    this.uiPreparationDeviceConnected = this.preparationDeviceConnected();
    this.uiPreparationDeviceType = this.getDataPreparationDeviceType();
    this.uiHasAPreparationDeviceSet = this.hasAPreparationDeviceSet();
  }

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public getPreparation(): Preparation {
    return this.uiPreparationStorage.getByUUID(this.data.method_of_preparation);
  }

  public async instance() {
    await this.instancePreparationDevice(this.data);
  }

  public hasTargetWeightActive() {
    return this.getTargetWeight() > 0;
  }

  public getTargetWeight(): number {
    const connectedType = this.getDataPreparationDeviceType();
    let targetWeight = 0;
    if (connectedType === PreparationDeviceType.XENIA) {
      targetWeight =
        this.data.preparationDeviceBrew?.params.scriptAtWeightReachedNumber;
    } else if (connectedType === PreparationDeviceType.SANREMO_YOU) {
      targetWeight = this.data.preparationDeviceBrew?.params.stopAtWeight;
    }
    return targetWeight;
  }

  public sanremoSelectedModeChange() {
    const selectedMode: SanremoYOUMode =
      this.data.preparationDeviceBrew?.params.selectedMode;
    if (selectedMode === SanremoYOUMode.LISTENING) {
      (
        this.data.preparationDeviceBrew?.params as SanremoYOUParams
      ).stopAtWeight = 0;
      this.drawTargetWeight(0);
    }
    this.sanremoYOUModeSelected();
  }

  public drawTargetWeight(_weight: number) {
    this.brewComponent.brewBrewingGraphEl?.drawTargetWeight(_weight);
  }

  public sanremoYOUModeSelected() {
    this.brewComponent.brewBrewingGraphEl?.sanremoYOUModeSelected();
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
    /** If a user changes the preparation device, we need to unset the preparation device here firstly **/
    this.preparationDevice = undefined;
    this.preparation = this.data.getPreparation();
    const connectedDevice: PreparationDevice =
      this.uiPreparationHelper.getConnectedDevice(this.preparation);
    if (connectedDevice) {
      if (connectedDevice instanceof XeniaDevice) {
        await this.instanceXeniaPreparationDevice(connectedDevice, _brew);
      } else if (connectedDevice instanceof MeticulousDevice) {
        await this.instanceMeticulousPreparationDevice(connectedDevice, _brew);
      } else if (connectedDevice instanceof SanremoYOUDevice) {
        await this.instanceSanremoYOUPreparationDevice(connectedDevice, _brew);
      } else if (connectedDevice instanceof GaggiuinoDevice) {
        await this.instanceGaggiuinoPreparationDevice(connectedDevice, _brew);
      }

      this.checkChanges();
    } else {
      this.preparationDevice = undefined;
    }
    await this.setUIParams();
  }
  private async instanceXeniaPreparationDevice(
    connectedDevice: PreparationDevice,
    _brew: Brew = null,
  ) {
    let preparationDeviceNotConnected: boolean = false;
    try {
      await this.uiAlert.showLoadingSpinner(
        'PREPARATION_DEVICE.TYPE_XENIA.CHECKING_CONNECTION_TO_PORTAFILTER',
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
            true,
          );
        },
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
      true,
    );
    try {
      try {
        const xeniaScripts = await this.preparationDevice.getScripts();
        this.preparationDevice.mapScriptsAndSaveTemp(xeniaScripts);
      } catch (ex) {
        this.uiToast.showInfoToast(
          'We could not get scripts from xenia: ' + JSON.stringify(ex),
          false,
        );
      }
      // We didn't set any data yet
      if (this.data.preparationDeviceBrew.type === PreparationDeviceType.NONE) {
        if (!this.isEdit) {
          // If a brew was passed, we came from loading, else we just swapped the preparation toolings
          let wasSomethingSet: boolean = false;
          if (_brew) {
            if (
              _brew.preparationDeviceBrew.type === PreparationDeviceType.XENIA
            ) {
              this.data.preparationDeviceBrew = this.uiHelper.cloneData(
                _brew.preparationDeviceBrew,
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
                  b.preparationDeviceBrew.type === PreparationDeviceType.XENIA,
              );
              if (foundEntry) {
                this.data.preparationDeviceBrew = this.uiHelper.cloneData(
                  foundEntry.preparationDeviceBrew,
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
                (e) => e.INDEX === xeniaParams.scriptStartId,
              ) === -1
            ) {
              // Script not found.
              this.data.preparationDeviceBrew.params.scriptStartId = 0;
              isAScriptMissing = true;
            }
            if (
              xeniaParams.scriptAtFirstDripId > 2 &&
              this.preparationDevice.scriptList.findIndex(
                (e) => e.INDEX === xeniaParams.scriptAtFirstDripId,
              ) === -1
            ) {
              // Script not found.
              this.data.preparationDeviceBrew.params.scriptAtFirstDripId = 0;
              isAScriptMissing = true;
            }
            if (
              xeniaParams.scriptAtWeightReachedId > 2 &&
              this.preparationDevice.scriptList.findIndex(
                (e) => e.INDEX === xeniaParams.scriptAtWeightReachedId,
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
                true,
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
    _brew: Brew = null,
  ) {
    this.data.preparationDeviceBrew.type = PreparationDeviceType.METICULOUS;
    this.data.preparationDeviceBrew.params = new MeticulousParams();

    await connectedDevice.connectToSocket().then(
      async (_connected) => {
        if (_connected) {
          this.preparationDevice = connectedDevice as MeticulousDevice;
          this.preparationDevice.loadProfiles();
        }
      },
      () => {
        //Should never trigger
      },
    );
  }

  private async instanceGaggiuinoPreparationDevice(
    connectedDevice: GaggiuinoDevice,
    _brew: Brew = null,
  ) {
    this.data.preparationDeviceBrew.type = PreparationDeviceType.GAGGIUINO;
    this.data.preparationDeviceBrew.params = new GaggiuinoParams();

    await this.uiAlert.showLoadingSpinner();
    await connectedDevice.deviceConnected().then(
      async () => {
        await this.uiAlert.hideLoadingSpinner();
        this.preparationDevice = connectedDevice as GaggiuinoDevice;
      },
      async () => {
        await this.uiAlert.hideLoadingSpinner();
        //Not connected
        this.uiAlert.showMessage(
          'PREPARATION_DEVICE.TYPE_GAGGIUINO_YOU.ERROR_CONNECTION_COULD_NOT_BE_ESTABLISHED',
          'CARE',
          'OK',
          true,
        );
      },
    );

    if (!this.preparationDevice) {
      //Ignore the rest of this function
      return;
    }
  }

  private async instanceSanremoYOUPreparationDevice(
    connectedDevice: SanremoYOUDevice,
    _brew: Brew = null,
  ) {
    this.data.preparationDeviceBrew.type = PreparationDeviceType.SANREMO_YOU;
    this.data.preparationDeviceBrew.params = new SanremoYOUParams();

    await this.uiAlert.showLoadingSpinner();
    await connectedDevice.deviceConnected().then(
      async () => {
        await this.uiAlert.hideLoadingSpinner();
        this.preparationDevice = connectedDevice as SanremoYOUDevice;
      },
      async () => {
        await this.uiAlert.hideLoadingSpinner();
        //Not connected
        this.uiAlert.showMessage(
          'PREPARATION_DEVICE.TYPE_SANREMO_YOU.ERROR_CONNECTION_COULD_NOT_BE_ESTABLISHED',
          'CARE',
          'OK',
          true,
        );
      },
    );

    if (!this.preparationDevice) {
      //Ignore the rest of this function
      return;
    } else {
      if (this.baristamode === true) {
        this.data.preparationDeviceBrew.params.selectedMode =
          SanremoYOUMode.LISTENING_AND_CONTROLLING;
        this.sanremoYOUModeSelected();

        if (this.baristamode) {
          if (
            this.preparation.connectedPreparationDevice.customParams
              .stopAtWeightP1
          ) {
            this.data.preparationDeviceBrew.params.stopAtWeightP1 =
              this.preparation.connectedPreparationDevice.customParams.stopAtWeightP1;
          }
          if (
            this.preparation.connectedPreparationDevice.customParams
              .stopAtWeightP2
          ) {
            this.data.preparationDeviceBrew.params.stopAtWeightP2 =
              this.preparation.connectedPreparationDevice.customParams.stopAtWeightP2;
          }
          if (
            this.preparation.connectedPreparationDevice.customParams
              .stopAtWeightP3
          ) {
            this.data.preparationDeviceBrew.params.stopAtWeightP3 =
              this.preparation.connectedPreparationDevice.customParams.stopAtWeightP3;
          }
          if (
            this.preparation.connectedPreparationDevice.customParams
              .stopAtWeightM
          ) {
            this.data.preparationDeviceBrew.params.stopAtWeightM =
              this.preparation.connectedPreparationDevice.customParams.stopAtWeightM;
          }
        }
      }
    }

    if (this.baristamode === false) {
      if (!this.isEdit) {
        // If a brew was passed, we came from loading, else we just swapped the preparation toolings
        let wasSomethingSet: boolean = false;
        if (_brew) {
          if (_brew.preparationDeviceBrew.type !== PreparationDeviceType.NONE) {
            this.data.preparationDeviceBrew = this.uiHelper.cloneData(
              _brew.preparationDeviceBrew,
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
                b.preparationDeviceBrew.type ===
                PreparationDeviceType.SANREMO_YOU,
            );
            if (foundEntry) {
              this.data.preparationDeviceBrew = this.uiHelper.cloneData(
                foundEntry.preparationDeviceBrew,
              );
            }
          }
        }
      }
    }

    return;
    /**
    // Seccond call
    await connectedDevice.deviceConnected().then(
      () => {},
      () => {},
    );
    //Third call call

    const apiThirdCallDelayStart = moment(); // create a moment with the current time
    let apiDelayEnd;
    const delayCallTimeout = setTimeout(() => {
      let apiTakesToLong: boolean = false;
      let delta;
      if (apiDelayEnd === undefined) {
        //After 2 seconds we didn't even hit the return
        delta = 1000;
      } else {
        delta = apiDelayEnd.diff(apiThirdCallDelayStart, 'milliseconds'); // get the millisecond difference
      }
      if (delta > 200) {
        apiTakesToLong = true;
      }

      if (apiTakesToLong) {
        this.uiAlert.showMessage(
          this.translate.instant('SANREMO_API_RESPONSE_TAKE_TO_LONG', {
            time: delta,
          }),
          this.translate.instant('CARE'),
          this.translate.instant('OK'),
          false,
        );
      }
    }, 1000);
    await connectedDevice.deviceConnected().then(
      () => {
        apiDelayEnd = moment(); // create a moment with the other time timestamp in seconds
      },
      () => {
        clearTimeout(delayCallTimeout);
      },
    );**/
  }

  public async importShotFromMeticulous() {
    const modal = await this.modalController.create({
      component: BrewModalImportShotMeticulousComponent,
      id: BrewModalImportShotMeticulousComponent.COMPONENT_ID,
      componentProps: {
        meticulousDevice: this.preparationDevice as MeticulousDevice,
      },
    });

    await modal.present();
    const rData = await modal.onWillDismiss();

    if (rData && rData.data && rData.data.choosenHistory) {
      const chosenEntry = rData.data.choosenHistory as HistoryListingEntry;
      this.generateShotFlowProfileFromMeticulousData(chosenEntry);
    }
  }

  public async importShotFromGaggiuino() {
    const modal = await this.modalController.create({
      component: BrewModalImportShotGaggiuinoComponent,
      id: BrewModalImportShotGaggiuinoComponent.COMPONENT_ID,
      componentProps: {
        gaggiuinoDevice: this.preparationDevice as GaggiuinoDevice,
      },
    });

    await modal.present();
    const rData = await modal.onWillDismiss();
    if (rData && rData.data && rData.data.choosenData) {
      const chosenEntry = rData.data.choosenData as GaggiuinoShotData;
      this.generateShotFlowProfileFromGaggiuinoData(chosenEntry);
    }
  }

  private generateShotFlowProfileFromGaggiuinoData(
    shotData: GaggiuinoShotData,
  ) {
    const newMoment = moment(new Date()).startOf('day');

    let firstDripTimeSet: boolean = false;
    const newBrewFlow = new BrewFlow();

    let seconds: number = 0;
    let milliseconds: number = 0;

    const datapoints = shotData.rawData.datapoints;

    for (let i = 0; i < datapoints.timeInShot.length; i++) {
      const shotEntry: any = datapoints;
      const shotEntryTime = newMoment
        .clone()
        .add('seconds', shotEntry.timeInShot[i] / 10);
      const timestamp = shotEntryTime.format('HH:mm:ss.SSS');

      seconds = shotEntryTime.diff(newMoment, 'seconds');
      milliseconds = shotEntryTime.get('milliseconds');

      const realtimeWaterFlow: IBrewRealtimeWaterFlow =
        {} as IBrewRealtimeWaterFlow;

      realtimeWaterFlow.brew_time = '';
      realtimeWaterFlow.timestamp = timestamp;
      realtimeWaterFlow.smoothed_weight = 0;
      realtimeWaterFlow.flow_value = shotEntry.pumpFlow[i] / 10;
      realtimeWaterFlow.timestampdelta = 0;

      newBrewFlow.realtimeFlow.push(realtimeWaterFlow);

      const brewFlow: IBrewWeightFlow = {} as IBrewWeightFlow;
      brewFlow.timestamp = timestamp;
      brewFlow.brew_time = '';
      brewFlow.actual_weight = shotEntry.shotWeight[i] / 10;
      brewFlow.old_weight = 0;
      brewFlow.actual_smoothed_weight = 0;
      brewFlow.old_smoothed_weight = 0;
      brewFlow.not_mutated_weight = 0;
      newBrewFlow.weight.push(brewFlow);

      if (brewFlow.actual_weight > 0 && firstDripTimeSet === false) {
        firstDripTimeSet = true;

        this.brewComponent.brewFirstDripTime?.setTime(seconds, milliseconds);
        this.brewComponent.brewFirstDripTime?.changeEvent();
      }

      const pressureFlow: IBrewPressureFlow = {} as IBrewPressureFlow;
      pressureFlow.timestamp = timestamp;
      pressureFlow.brew_time = '';
      pressureFlow.actual_pressure = shotEntry.pressure[i] / 10;
      pressureFlow.old_pressure = 0;
      newBrewFlow.pressureFlow.push(pressureFlow);

      const temperatureFlow: IBrewTemperatureFlow = {} as IBrewTemperatureFlow;
      temperatureFlow.timestamp = timestamp;
      temperatureFlow.brew_time = '';
      temperatureFlow.actual_temperature = shotEntry.temperature[i] / 10;
      temperatureFlow.old_temperature = 0;
      newBrewFlow.temperatureFlow.push(temperatureFlow);
    }

    const lastEntry = newBrewFlow.weight[newBrewFlow.weight.length - 1];

    try {
      const globalStopWeight: number =
        shotData.rawData.profile.globalStopConditions.weight;
      this.brewComponent.data.brew_beverage_quantity = globalStopWeight;
    } catch (ex) {
      this.brewComponent.data.brew_beverage_quantity = lastEntry.actual_weight;
    }

    this.brewComponent.data.brew_temperature =
      shotData.rawData.profile.waterTemperature;
    this.brewComponent.data.pressure_profile = shotData.rawData.profile.name;

    try {
      /**Set the custom creation date, the user needs to activate the parameter for custom creation date**/
      this.brewComponent.customCreationDate = moment
        .unix(shotData.timestamp)
        .toISOString();
    } catch (e) {
      this.brewComponent.customCreationDate = '';
    }

    this.brewComponent.timer?.setTime(seconds, milliseconds);
    this.brewComponent.timer?.changeEvent();

    this.brewComponent.brewBrewingGraphEl.flow_profile_raw = newBrewFlow;
    this.brewComponent.brewBrewingGraphEl.initializeFlowChart(true);

    (
      this.data.preparationDeviceBrew.params as GaggiuinoParams
    ).chosenProfileName = shotData.rawData.profile.name;
    (
      this.data.preparationDeviceBrew.params as GaggiuinoParams
    ).chosenProfileId = shotData.rawData.profile.id;
    (this.data.preparationDeviceBrew.params as GaggiuinoParams).shotId =
      shotData.rawData.id;
  }

  private generateShotFlowProfileFromMeticulousData(_historyData) {
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

        this.brewComponent.brewFirstDripTime?.setTime(seconds, milliseconds);
        this.brewComponent.brewFirstDripTime?.changeEvent();
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

    this.brewComponent.timer?.setTime(seconds, milliseconds);
    this.brewComponent.timer?.changeEvent();

    this.brewComponent.brewBrewingGraphEl.flow_profile_raw = newBrewFlow;
    this.brewComponent.brewBrewingGraphEl.initializeFlowChart(true);
  }

  public getPreparationDeviceType() {
    if (this.preparationDevice instanceof XeniaDevice) {
      return PreparationDeviceType.XENIA;
    } else if (this.preparationDevice instanceof MeticulousDevice) {
      return PreparationDeviceType.METICULOUS;
    } else if (this.preparationDevice instanceof SanremoYOUDevice) {
      return PreparationDeviceType.SANREMO_YOU;
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

  protected readonly SanremoYOUMode = SanremoYOUMode;
}
