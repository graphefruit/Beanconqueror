import {
  ChangeDetectorRef,
  Component,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { ModalController, NavParams, Platform } from '@ionic/angular';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { Brew } from '../../../classes/brew/brew';
import moment from 'moment';
import { UIToast } from '../../../services/uiToast';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { Preparation } from '../../../classes/preparation/preparation';
import { UILog } from '../../../services/uiLog';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { Settings } from '../../../classes/settings/settings';
import { UIHealthKit } from '../../../services/uiHealthKit';
import { Insomnia } from '@awesome-cordova-plugins/insomnia/ngx';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { UIAlert } from '../../../services/uiAlert';
import { BrewTrackingService } from '../../../services/brewTracking/brew-tracking.service';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';

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
import { UIHelper } from '../../../services/uiHelper';
import { VisualizerService } from '../../../services/visualizerService/visualizer-service.service';
import { Subscription } from 'rxjs';
import { HapticService } from '../../../services/hapticService/haptic.service';
import { PreparationDeviceType } from '../../../classes/preparationDevice';

declare var Plotly;

@Component({
  selector: 'brew-add',
  templateUrl: './brew-add.component.html',
  styleUrls: ['./brew-add.component.scss'],
})
export class BrewAddComponent implements OnInit, OnDestroy {
  public static readonly COMPONENT_ID: string = 'brew-add';
  public brew_template: Brew;
  public data: Brew = new Brew();
  public settings: Settings;

  public loadSpecificLastPreparation: Preparation;

  @ViewChild('brewBrewing', { read: BrewBrewingComponent, static: false })
  public brewBrewing: BrewBrewingComponent;

  @Input() private hide_toast_message: boolean;

  public showFooter: boolean = true;
  private initialBeanData: string = '';
  private disableHardwareBack;
  public bluetoothSubscription: Subscription = undefined;

  constructor(
    private readonly modalController: ModalController,
    private readonly navParams: NavParams,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiMillStorage: UIMillStorage,
    private readonly uiToast: UIToast,
    private readonly platform: Platform,
    private readonly geolocation: Geolocation,
    private readonly uiLog: UILog,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly uiHealthKit: UIHealthKit,
    private readonly insomnia: Insomnia,
    private readonly uiAlert: UIAlert,
    private readonly brewTracking: BrewTrackingService,
    private readonly uiAnalytics: UIAnalytics,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly visualizerService: VisualizerService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly hapticService: HapticService
  ) {
    // Initialize to standard in drop down

    this.settings = this.uiSettingsStorage.getSettings();
    this.brew_template = this.navParams.get('brew_template');
    this.loadSpecificLastPreparation = this.navParams.get(
      'loadSpecificLastPreparation'
    );

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
  }
  @HostListener('window:keyboardWillShow')
  private hideFooter() {
    // Describe your logic which will be run each time when keyboard is about to be shown.
    this.showFooter = false;
  }
  @HostListener('window:keyboardWillHide')
  private showFooterAgain() {
    // Describe your logic which will be run each time when keyboard is about to be closed.
    this.showFooter = true;
  }

  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.ADD);
    if (this.settings.wake_lock) {
      this.insomnia.keepAwake().then(
        () => {},
        () => {}
      );
    }

    this.getCoordinates(true);
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
          }
        );
    } else {
      this.dismiss();
    }
  }

  public ionViewWillLeave() {
    if (this.settings.wake_lock) {
      this.insomnia.allowSleepAgain().then(
        () => {},
        () => {}
      );
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

  private getCoordinates(_highAccuracy: boolean) {
    if (this.settings.track_brew_coordinates) {
      this.geolocation
        .getCurrentPosition({
          maximumAge: 3000,
          timeout: 5000,
          enableHighAccuracy: _highAccuracy,
        })
        .then((resp) => {
          this.data.coordinates.latitude = resp.coords.latitude;
          this.data.coordinates.accuracy = resp.coords.accuracy;
          this.data.coordinates.altitude = resp.coords.altitude;
          this.data.coordinates.altitudeAccuracy = resp.coords.altitudeAccuracy;
          this.data.coordinates.heading = resp.coords.heading;
          this.data.coordinates.speed = resp.coords.speed;
          this.data.coordinates.longitude = resp.coords.longitude;
          this.uiLog.info(
            'BREW - Coordinates found - ' +
              JSON.stringify(this.data.coordinates)
          );
        })
        .catch((_error) => {
          // Couldn't get coordinates sorry.
          this.uiLog.error('BREW - No Coordinates found');
          if (_highAccuracy === true) {
            this.uiLog.error('BREW - Try to get coordinates with low accuracy');
            this.getCoordinates(false);
          }
        });
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
          this.brewBrewing.brewBrewingGraphEl.profileDiv.nativeElement
        );
      }
    } catch (ex) {}
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewAddComponent.COMPONENT_ID
    );
  }

  private stopScaleTimer() {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      scale.setTimer(SCALE_TIMER_COMMAND.STOP);
    }
  }

  public async finish() {
    await this.uiAlert.showLoadingMessage(undefined, undefined, true);
    await sleep(50);
    try {
      this.uiLog.log('Brew add - Step 1');
      await this.manageBrewBrewingTimer();

      this.uiLog.log('Brew add - Step 2');
      this.uiBrewHelper.cleanInvisibleBrewData(this.data);

      this.uiLog.log('Brew add - Step 3');
      const addedBrewObj: Brew = await this.uiBrewStorage.add(this.data);

      this.uiLog.log('Brew add - Step 4');
      await this.manageFlowProfile(addedBrewObj);

      await this.manageCustomBrewTime(addedBrewObj);

      this.manageUploadToVisualizer(addedBrewObj);

      this.manageCaffeineConsumption();

      if (!this.hide_toast_message) {
        this.uiToast.showInfoToast('TOAST_BREW_ADDED_SUCCESSFULLY');
      }
      this.uiLog.log('Brew add - Step 8');
      this.brewTracking.trackBrew(addedBrewObj);
      this.uiLog.log('Brew add - Step 9');
      await this.uiAlert.hideLoadingSpinner();
      await sleep(100);

      if (this.uiBrewHelper.checkIfBeanPackageIsConsumed(this.data.getBean())) {
        await this.uiBrewHelper.checkIfBeanPackageIsConsumedTriggerMessageAndArchive(
          this.data.getBean()
        );
      }

      this.uiAnalytics.trackEvent(
        BREW_TRACKING.TITLE,
        BREW_TRACKING.ACTIONS.ADD_FINISH
      );
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
        moment(this.brewBrewing.customCreationDate).toDate()
      );
    }
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
        this.brewBrewing.customCreationDate
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
        addedBrewObj.config.uuid
      );
      if (savedPath !== '') {
        addedBrewObj.flow_profile = savedPath;
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
        }
      );
    }
  }

  public ngOnDestroy() {
    if (this.bluetoothSubscription) {
      this.bluetoothSubscription.unsubscribe();
      this.bluetoothSubscription = undefined;
    }
  }

  protected readonly PreparationDeviceType = PreparationDeviceType;
}
