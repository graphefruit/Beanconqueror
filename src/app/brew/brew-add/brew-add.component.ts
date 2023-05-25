import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import {
  LoadingController,
  ModalController,
  NavParams,
  Platform,
} from '@ionic/angular';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { Brew } from '../../../classes/brew/brew';
import moment from 'moment';
import { UIToast } from '../../../services/uiToast';
import { TranslateService } from '@ngx-translate/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { Preparation } from '../../../classes/preparation/preparation';
import { UILog } from '../../../services/uiLog';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { Settings } from '../../../classes/settings/settings';
import { UIHealthKit } from '../../../services/uiHealthKit';
import { Insomnia } from '@ionic-native/insomnia/ngx';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { UIAlert } from '../../../services/uiAlert';
import { BrewTrackingService } from '../../../services/brewTracking/brew-tracking.service';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';

import { SettingsPopoverBluetoothActionsComponent } from '../../settings/settings-popover-bluetooth-actions/settings-popover-bluetooth-actions.component';
import { BluetoothScale, SCALE_TIMER_COMMAND } from '../../../classes/devices';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { UIHelper } from '../../../services/uiHelper';

declare var Plotly;
declare var window;
@Component({
  selector: 'brew-add',
  templateUrl: './brew-add.component.html',
  styleUrls: ['./brew-add.component.scss'],
})
export class BrewAddComponent implements OnInit {
  public static COMPONENT_ID: string = 'brew-add';
  public brew_template: Brew;
  public data: Brew = new Brew();
  public settings: Settings;

  public loadSpecificLastPreparation: Preparation;

  @ViewChild('brewBrewing', { read: BrewBrewingComponent, static: false })
  public brewBrewing: BrewBrewingComponent;

  @Input() private hide_toast_message: boolean;

  public showFooter: boolean = true;
  constructor(
    private readonly modalController: ModalController,
    private readonly navParams: NavParams,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiMillStorage: UIMillStorage,
    private readonly uiToast: UIToast,
    private readonly translate: TranslateService,
    private readonly platform: Platform,
    private readonly geolocation: Geolocation,
    private readonly loadingController: LoadingController,
    private readonly uiLog: UILog,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly uiHealthKit: UIHealthKit,
    private readonly insomnia: Insomnia,
    private readonly uiAlert: UIAlert,
    private readonly brewTracking: BrewTrackingService,
    private readonly uiAnalytics: UIAnalytics,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly uiHelper: UIHelper
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
      .sort((a, b) => a.name.localeCompare(b.name))[0].config.uuid;

    this.data.method_of_preparation = this.uiPreparationStorage
      .getAllEntries()
      .filter((e) => !e.finished)
      .sort((a, b) => a.name.localeCompare(b.name))[0].config.uuid;

    this.data.mill = this.uiMillStorage
      .getAllEntries()
      .filter((e) => !e.finished)
      .sort((a, b) => a.name.localeCompare(b.name))[0].config.uuid;

    window.addEventListener('keyboardWillShow', (event) => {
      // Describe your logic which will be run each time when keyboard is about to be shown.
      this.showFooter = false;
    });

    window.addEventListener('keyboardWillHide', () => {
      // Describe your logic which will be run each time when keyboard is about to be closed.
      this.showFooter = true;
    });
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
  }

  public ionViewWillLeave() {
    if (this.settings.wake_lock) {
      this.insomnia.allowSleepAgain().then(
        () => {},
        () => {}
      );
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
        .catch((error) => {
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
    this.stopScaleTimer();
    try {
      Plotly.purge('flowProfileChart');
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
    await this.uiAlert.showLoadingSpinner();
    try {
      this.uiBrewHelper.cleanInvisibleBrewData(this.data);
      const addedBrewObj: Brew = await this.uiBrewStorage.add(this.data);

      if (
        this.brewBrewing.flow_profile_raw.weight.length > 0 ||
        this.brewBrewing.flow_profile_raw.pressureFlow.length > 0 ||
        this.brewBrewing.flow_profile_raw.temperatureFlow.length > 0
      ) {
        const savedPath = this.brewBrewing.saveFlowProfile(
          addedBrewObj.config.uuid
        );
        addedBrewObj.flow_profile = savedPath;
        await this.uiBrewStorage.update(addedBrewObj);
      }

      let checkData: Settings | Preparation;
      if (this.getPreparation().use_custom_parameters === true) {
        checkData = this.getPreparation();
      } else {
        checkData = this.settings;
      }

      if (checkData.manage_parameters.set_custom_brew_time) {
        addedBrewObj.config.unix_timestamp = moment(
          this.brewBrewing.customCreationDate
        ).unix();
        await this.uiBrewStorage.update(addedBrewObj);
      }

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
      if (!this.hide_toast_message) {
        this.uiToast.showInfoToast('TOAST_BREW_ADDED_SUCCESSFULLY');
      }

      this.brewTracking.trackBrew(addedBrewObj);
    } catch (ex) {}
    await this.uiAlert.hideLoadingSpinner();
    await this.uiBrewHelper.checkIfBeanPackageIsConsumedTriggerMessageAndArchive(
      this.data.getBean()
    );
    this.uiAnalytics.trackEvent(
      BREW_TRACKING.TITLE,
      BREW_TRACKING.ACTIONS.ADD_FINISH
    );
    this.dismiss();
  }

  public getPreparation(): Preparation {
    return this.uiPreparationStorage.getByUUID(this.data.method_of_preparation);
  }

  public ngOnInit() {}
}
