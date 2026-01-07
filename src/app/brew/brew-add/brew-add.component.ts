import {
  ChangeDetectorRef,
  Component,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { ModalController, Platform } from '@ionic/angular/standalone';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { Brew } from '../../../classes/brew/brew';
import moment from 'moment';
import { UIToast } from '../../../services/uiToast';
import { Preparation } from '../../../classes/preparation/preparation';
import { UILog } from '../../../services/uiLog';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { Settings } from '../../../classes/settings/settings';
import { UIHealthKit } from '../../../services/uiHealthKit';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { UIAlert } from '../../../services/uiAlert';
import { BrewTrackingService } from '../../../services/brewTracking/brew-tracking.service';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes'; // Added import

import { SettingsPopoverBluetoothActionsComponent } from '../../settings/settings-popover-bluetooth-actions/settings-popover-bluetooth-actions.component';
import {
  BluetoothScale,
  SCALE_TIMER_COMMAND,
  sleep,
} from '../../../classes/devices';
import {
  CoffeeBluetoothDevicesService,
  CoffeeBluetoothServiceEvent,
} from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { VisualizerService } from '../../../services/visualizerService/visualizer-service.service';
import { Subscription } from 'rxjs';
import { HapticService } from '../../../services/hapticService/haptic.service';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { XeniaDevice } from '../../../classes/preparationDevice/xenia/xeniaDevice';
import { BrewFlow } from '../../../classes/brew/brewFlow';
import { REFERENCE_GRAPH_TYPE } from '../../../enums/brews/referenceGraphType';
import { ReferenceGraph } from '../../../classes/brew/referenceGraph';
import { UIHelper } from '../../../services/uiHelper';
import { Bean } from '../../../classes/bean/bean';
import { EventQueueService } from '../../../services/queueService/queue-service.service';
import { AppEventType } from '../../../enums/appEvent/appEvent';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { Mill } from '../../../classes/mill/mill';
import { DisableDoubleClickDirective } from '../../../directive/disable-double-click.directive';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonChip,
  IonContent,
  IonFooter,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';

declare var Plotly;

// Define this interface if not already globally available or imported
interface IEventPayload {
  category: string;
  action: string;
  name?: string;
  value?: number;
}

@Component({
  selector: 'brew-add',
  templateUrl: './brew-add.component.html',
  styleUrls: ['./brew-add.component.scss'],
  imports: [
    BrewBrewingComponent,
    DisableDoubleClickDirective,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonChip,
    IonContent,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class BrewAddComponent implements OnInit, OnDestroy {
  private readonly modalController = inject(ModalController);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiToast = inject(UIToast);
  private readonly platform = inject(Platform);
  private readonly uiLog = inject(UILog);
  private readonly uiBrewHelper = inject(UIBrewHelper);
  private readonly uiHealthKit = inject(UIHealthKit);
  private readonly uiAlert = inject(UIAlert);
  private readonly brewTracking = inject(BrewTrackingService);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly bleManager = inject(CoffeeBluetoothDevicesService);
  private readonly visualizerService = inject(VisualizerService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly hapticService = inject(HapticService);
  private readonly uiHelper = inject(UIHelper);
  private readonly eventQueue = inject(EventQueueService);

  public static readonly COMPONENT_ID: string = 'brew-add';
  @Input('brew_template') public brew_template: Brew;
  public data: Brew = new Brew();
  public settings: Settings;

  @Input() public brew_flow_preset: BrewFlow;
  @Input() public bean_preset: Bean;

  @Input('loadSpecificLastPreparation')
  public loadSpecificLastPreparation: Preparation;

  @ViewChild('brewBrewing', { read: BrewBrewingComponent, static: false })
  public brewBrewing: BrewBrewingComponent;

  @Input() private hide_toast_message: boolean;

  public showFooter: boolean = true;
  private initialBeanData: string = '';
  private disableHardwareBack;
  public bluetoothSubscription: Subscription = undefined;
  public automaticSaveSubscription: Subscription = undefined;
  public readonly PreparationDeviceType = PreparationDeviceType;

  constructor() {
    // Initialize to standard in drop down
    this.settings = this.uiSettingsStorage.getSettings();

    // Get first entry
    this.data.bean = this.uiBeanStorage
      .getAllEntries()
      .filter((bean) => !bean.finished)
      .sort((a, b) => a.name.localeCompare(b.name))[0]?.config?.uuid;

    this.data.method_of_preparation = this.uiPreparationStorage
      .getAllEntries()
      .filter((e) => !e.finished)
      .sort((a, b) => a.name.localeCompare(b.name))[0]?.config?.uuid;

    this.data.mill = this.uiMillStorage
      .getAllEntries()
      .filter((e) => !e.finished)
      .sort((a, b) => a.name.localeCompare(b.name))[0]?.config?.uuid;

    const eventSubs = this.eventQueue.on(AppEventType.BREW_AUTOMATIC_SAVE);
    this.automaticSaveSubscription = eventSubs.subscribe((event) => {
      this.finish(true);
    });
  }
  @HostListener('window:keyboardWillShow')
  public hideFooter() {
    // Describe your logic which will be run each time when keyboard is about to be shown.
    this.showFooter = false;
  }
  @HostListener('window:keyboardWillHide')
  public showFooterAgain() {
    // Describe your logic which will be run each time when keyboard is about to be closed.
    this.showFooter = true;
  }

  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.ADD);
    if (this.settings.wake_lock) {
      this.uiHelper.deviceKeepAwake();
    }

    /**
     * We don'T need to await here, because the coordinates are set in the background
     */
    this.setCoordinates(true);

    this.initialBeanData = JSON.stringify(this.data);

    this.bluetoothSubscription = this.bleManager
      .attachOnEvent()
      .subscribe((_type) => {
        if (
          _type === CoffeeBluetoothServiceEvent.DISCONNECTED_SCALE ||
          _type === CoffeeBluetoothServiceEvent.CONNECTED_SCALE
        ) {
          this.checkChanges();
        }
      });
  }

  private checkChanges() {
    // #507 Wrapping check changes in set timeout so all values get checked
    setTimeout(() => {
      this.changeDetectorRef.detectChanges();
      window.getComputedStyle(window.document.getElementsByTagName('body')[0]);
    }, 15);
  }

  public confirmDismiss(): void {
    if (this.settings.security_check_when_going_back === false) {
      this.dismiss();
      return;
    }
    if (JSON.stringify(this.data) !== this.initialBeanData) {
      this.uiAlert
        .showConfirm('PAGE_BREW_DISCARD_CONFIRM', 'SURE_QUESTION', true)
        .then(
          async () => {
            this.dismiss();
          },
          () => {
            // No
          },
        );
    } else {
      this.dismiss();
    }
  }

  public ionViewWillLeave() {
    if (this.settings.wake_lock) {
      this.uiHelper.deviceAllowSleepAgain();
    }
  }

  public smartScaleConnected() {
    try {
      return this.bleManager.getScale() !== null;
    } catch (ex) {
      return false;
    }
  }

  public smartScaleSupportsTaring() {
    try {
      return this.bleManager.getScale().supportsTaring;
    } catch (ex) {
      return false;
    }
  }

  public async tareScale() {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      scale.tare();
      if (
        this.settings.haptic_feedback_active &&
        this.settings.haptic_feedback_tare
      ) {
        this.hapticService.vibrate();
      }
    }
  }

  private async setCoordinates(_highAccuracy: boolean): Promise<void> {
    if (!this.settings.track_brew_coordinates) {
      return;
    }
    try {
      const resp = await Geolocation.getCurrentPosition({
        maximumAge: 3000,
        timeout: 5000,
        enableHighAccuracy: _highAccuracy,
      });
      this.data.coordinates.latitude = resp.coords.latitude;
      this.data.coordinates.accuracy = resp.coords.accuracy;
      this.data.coordinates.altitude = resp.coords.altitude;
      this.data.coordinates.altitudeAccuracy = resp.coords.altitudeAccuracy;
      this.data.coordinates.heading = resp.coords.heading;
      this.data.coordinates.speed = resp.coords.speed;
      this.data.coordinates.longitude = resp.coords.longitude;
      this.uiLog.info(
        'BREW - Coordinates found - ' + JSON.stringify(this.data.coordinates),
      );
    } catch (error) {
      this.uiLog.error('BREW - No Coordinates found: ', error);
      if (_highAccuracy === true) {
        this.uiLog.error('BREW - Try to get coordinates with low accuracy');
        return await this.setCoordinates(false);
      }
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

  public async dismiss() {
    try {
      if (this.settings.security_check_when_going_back === true) {
        this.disableHardwareBack.unsubscribe();
      }
    } catch (ex) {}
    this.stopScaleTimer();
    try {
      if (this.brewBrewing.brewBrewingGraphEl) {
        Plotly.purge(
          this.brewBrewing.brewBrewingGraphEl.profileDiv.nativeElement,
        );
      }
    } catch (ex) {}
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewAddComponent.COMPONENT_ID,
    );
  }

  private stopScaleTimer() {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      scale.setTimer(SCALE_TIMER_COMMAND.STOP);
    }
  }

  public async finish(_automaticSave: boolean = false) {
    this.deattachBrewAutoSave();
    await this.uiAlert.showLoadingMessage(undefined, undefined, true);
    await sleep(50);
    try {
      this.uiLog.log('Brew add - Step 1');
      await this.manageBrewBrewingTimer();

      this.uiLog.log('Brew add - Step 2');
      this.uiBrewHelper.cleanInvisibleBrewData(this.data);
      this.uiBrewHelper.logUsedBrewParameters(this.data);

      this.uiLog.log('Brew add - Step 3');
      const addedBrewObj: Brew = await this.uiBrewStorage.add(this.data);

      this.uiLog.log('Brew add - Step 4');
      await this.manageFlowProfile(addedBrewObj);

      await this.manageCustomBrewTime(addedBrewObj);

      this.manageUploadToVisualizer(addedBrewObj);

      this.manageCaffeineConsumption();

      await this.manageOpenDateForBean(addedBrewObj);

      if (!this.hide_toast_message) {
        this.uiToast.showInfoToast('TOAST_BREW_ADDED_SUCCESSFULLY');
      }
      this.uiLog.log('Brew add - Step 8');
      this.brewTracking.trackBrew(addedBrewObj);
      this.uiLog.log('Brew add - Step 9');
      await this.uiAlert.hideLoadingSpinner();
      await sleep(100);

      if (_automaticSave === false) {
        if (
          this.uiBrewHelper.checkIfBeanPackageIsConsumed(this.data.getBean())
        ) {
          await this.uiBrewHelper.checkIfBeanPackageIsConsumedTriggerMessageAndArchive(
            this.data.getBean(),
          );
        }
      }
      const eventsToTrack: IEventPayload[] = [];
      // Add subsequent events to the same eventsToTrack array
      eventsToTrack.push({
        category: BREW_TRACKING.TITLE,
        action: BREW_TRACKING.ACTIONS.ADD_FINISH,
      });
      eventsToTrack.push({
        category: BREW_TRACKING.TITLE,
        action: BREW_TRACKING.ACTIONS.ADD_FINISH_PREPARATION_TYPE,
        name: addedBrewObj.getPreparation().type,
      });
      eventsToTrack.push({
        category: BREW_TRACKING.TITLE,
        action: BREW_TRACKING.ACTIONS.ADD_FINISH_PREPARATION_STYLE,
        name: addedBrewObj.getPreparation().style_type,
      });

      const bean: Bean = this.data.getBean();
      if (bean.roaster) {
        eventsToTrack.push({
          category: BEAN_TRACKING.TITLE,
          action:
            BEAN_TRACKING.ACTIONS.BREW_TRACKED.TITLE +
            '_' +
            bean.roaster +
            '_' +
            bean.name,
          name:
            BEAN_TRACKING.ACTIONS.BREW_TRACKED.PARAMETER.PREPARATION_NAME +
            '_' +
            addedBrewObj.getPreparation().name,
        });
        eventsToTrack.push({
          category: BEAN_TRACKING.TITLE,
          action:
            BEAN_TRACKING.ACTIONS.BREW_TRACKED.TITLE +
            '_' +
            bean.roaster +
            '_' +
            bean.name,
          name:
            BEAN_TRACKING.ACTIONS.BREW_TRACKED.PARAMETER.PREPARATION_TYPE +
            '_' +
            addedBrewObj.getPreparation().type,
        });
        eventsToTrack.push({
          category: BEAN_TRACKING.TITLE,
          action:
            BEAN_TRACKING.ACTIONS.BREW_TRACKED.TITLE +
            '_' +
            bean.roaster +
            '_' +
            bean.name,
          name:
            BEAN_TRACKING.ACTIONS.BREW_TRACKED.PARAMETER.PREPARATION_STYLE +
            '_' +
            addedBrewObj.getPreparation().style_type,
        });

        const water = this.data.getWater();
        if (water && water.name) {
          eventsToTrack.push({
            category: BEAN_TRACKING.TITLE,
            action:
              BEAN_TRACKING.ACTIONS.BREW_TRACKED +
              '_' +
              bean.roaster +
              '_' +
              bean.name,
            name:
              BEAN_TRACKING.ACTIONS.BREW_TRACKED.PARAMETER.WATER_NAME +
              '_' +
              water.name,
          });
        }

        const grinder: Mill = this.data.getMill();
        if (grinder && grinder.name) {
          eventsToTrack.push({
            category: BEAN_TRACKING.TITLE,
            action:
              BEAN_TRACKING.ACTIONS.BREW_TRACKED +
              '_' +
              bean.roaster +
              '_' +
              bean.name,
            name:
              BEAN_TRACKING.ACTIONS.BREW_TRACKED.PARAMETER.GRINDER_NAME +
              '_' +
              grinder.name,
          });
        }
      }

      // Single call to trackBulkEvents after all events are collected
      if (eventsToTrack.length > 0) {
        this.uiAnalytics.trackBulkEvents(eventsToTrack);
      }

      if (
        this.brewBrewing?.brewBrewingPreparationDeviceEl?.getDataPreparationDeviceType() ===
        PreparationDeviceType.XENIA
      ) {
        const prepDeviceCall: XeniaDevice = this.brewBrewing
          .brewBrewingPreparationDeviceEl.preparationDevice as XeniaDevice;
        if (prepDeviceCall.getSaveLogfilesFromMachine()) {
          try {
            const logs = await prepDeviceCall.getLogs();
            addedBrewObj.note =
              addedBrewObj.note + '\r\n' + JSON.stringify(logs);
            await this.uiBrewStorage.update(addedBrewObj);
          } catch (ex) {
            this.uiLog.log(
              'We could not get the logs from xenia: ' + JSON.stringify(ex),
            );
            this.uiToast.showInfoToast(
              'We could not get the logs from xenia: ' + JSON.stringify(ex),
              false,
            );
          }
        }
      }
    } catch (ex) {}

    await this.uiAlert.hideLoadingSpinner();
    await sleep(100);

    this.dismiss();
  }

  private manageCaffeineConsumption(): void {
    this.uiLog.log('Brew add - Step 7');
    if (
      this.settings.track_caffeine_consumption &&
      this.data.grind_weight > 0 &&
      this.data.getBean().decaffeinated === false
    ) {
      this.uiHealthKit.trackCaffeineConsumption(
        this.data.getCaffeineAmount(),
        moment(this.brewBrewing.customCreationDate).toDate(),
      );
    }
  }

  private async manageOpenDateForBean(addedBrewObj: Brew) {
    //#825
    try {
      this.uiLog.log('Brew add - Step OpenDateForBean');
      const bean = this.data.getBean();
      if (bean && !bean.openDate) {
        if (this.settings.bean_manage_parameters.openDate === true) {
          if (this.brewBrewing.customCreationDate) {
            bean.openDate = this.brewBrewing.customCreationDate;
          } else {
            bean.openDate = moment(new Date()).toISOString();
          }
          await this.uiBeanStorage.update(bean);
        }
      }
    } catch (ex) {}
  }

  private manageUploadToVisualizer(addedBrewObj: Brew): void {
    if (
      this.settings.visualizer_active &&
      this.settings.visualizer_upload_automatic
    ) {
      if (addedBrewObj.flow_profile) {
        this.uiLog.log('Upload shot to visualizer');
        this.visualizerService.uploadToVisualizer(addedBrewObj);
      } else {
        this.uiLog.log('No flow profile given, dont upload');
      }
    } else {
      this.uiLog.log('Visualizer not active or upload automatic not activated');
    }
  }

  private async manageCustomBrewTime(addedBrewObj: Brew): Promise<void> {
    const checkData = this.getSettingsOrPreparation();

    if (checkData.manage_parameters.set_custom_brew_time) {
      this.uiLog.log('Brew add - Step 6');
      addedBrewObj.config.unix_timestamp = moment(
        this.brewBrewing.customCreationDate,
      ).unix();
      await this.uiBrewStorage.update(addedBrewObj);
    }
  }

  private getSettingsOrPreparation(): Settings | Preparation {
    if (this.getPreparation().use_custom_parameters === true) {
      return this.getPreparation();
    } else {
      return this.settings;
    }
  }

  private async manageFlowProfile(addedBrewObj: Brew) {
    if (this.hasAnyFlowProfileRequisites()) {
      this.uiLog.log('Brew add - Step 5');
      const savedPath: string = await this.brewBrewing.saveFlowProfile(
        addedBrewObj.config.uuid,
      );
      if (savedPath !== '') {
        addedBrewObj.flow_profile = savedPath;
        await this.uiBrewStorage.update(addedBrewObj);
      }

      /**
       * if this is true, it means we have a brew flow preset, aswell as having a loaded reference profile, but the choosen reference profile is empty, that means it wasn't stored anywhere **/
      if (
        this.brew_flow_preset &&
        (this.brewBrewing.brewBrewingGraphEl.reference_profile_raw?.weight
          ?.length > 0 ||
          this.brewBrewing.brewBrewingGraphEl.reference_profile_raw
            ?.pressureFlow?.length > 0 ||
          this.brewBrewing.brewBrewingGraphEl.reference_profile_raw
            ?.temperatureFlow?.length > 0) &&
        addedBrewObj.reference_flow_profile.type === REFERENCE_GRAPH_TYPE.NONE
      ) {
        const path = await this.brewBrewing.saveReferenceFlowProfile(
          addedBrewObj.config.uuid,
        );

        addedBrewObj.reference_flow_profile = new ReferenceGraph();
        addedBrewObj.reference_flow_profile.type =
          REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH;
        addedBrewObj.reference_flow_profile.uuid = addedBrewObj.config.uuid;
        await this.uiBrewStorage.update(addedBrewObj);
      }
    }
  }

  private hasAnyFlowProfileRequisites() {
    return (
      this.brewBrewing.brewBrewingGraphEl?.flow_profile_raw.weight.length > 0 ||
      this.brewBrewing.brewBrewingGraphEl?.flow_profile_raw.pressureFlow
        .length > 0 ||
      this.brewBrewing.brewBrewingGraphEl?.flow_profile_raw.temperatureFlow
        .length > 0
    );
  }

  private async manageBrewBrewingTimer() {
    if (this.brewBrewing?.timer?.isTimerRunning()) {
      this.brewBrewing.timer.pauseTimer('click');

      await new Promise(async (resolve) => {
        setTimeout(() => {
          resolve(undefined);
        }, 100);
      });
    }
  }

  public getPreparation(): Preparation {
    return this.uiPreparationStorage.getByUUID(this.data.method_of_preparation);
  }

  public ngOnInit() {
    if (this.settings.security_check_when_going_back === true) {
      this.disableHardwareBack = this.platform.backButton.subscribeWithPriority(
        9999,
        (_processNextHandler) => {
          // Don't do anything.
          this.confirmDismiss();
        },
      );
    }
  }
  public deattachBrewAutoSave() {
    if (this.automaticSaveSubscription) {
      this.automaticSaveSubscription.unsubscribe();
      this.automaticSaveSubscription = undefined;
    }
  }

  public ngOnDestroy() {
    if (this.bluetoothSubscription) {
      this.bluetoothSubscription.unsubscribe();
      this.bluetoothSubscription = undefined;
    }
    this.deattachBrewAutoSave();
  }
}
