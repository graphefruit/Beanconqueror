import { Component, OnInit, ViewChild } from '@angular/core';
import { UIHelper } from '../../../services/uiHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { ModalController, NavParams, Platform } from '@ionic/angular';
import { Brew } from '../../../classes/brew/brew';
import moment from 'moment';
import { UIToast } from '../../../services/uiToast';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { BrewTrackingService } from '../../../services/brewTracking/brew-tracking.service';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Insomnia } from '@ionic-native/insomnia/ngx';
import { Settings } from '../../../classes/settings/settings';
import { SettingsPopoverBluetoothActionsComponent } from '../../settings/settings-popover-bluetooth-actions/settings-popover-bluetooth-actions.component';
import { BluetoothScale, SCALE_TIMER_COMMAND } from '../../../classes/devices';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
declare var Plotly;
declare var window;
@Component({
  selector: 'brew-edit',
  templateUrl: './brew-edit.component.html',
  styleUrls: ['./brew-edit.component.scss'],
})
export class BrewEditComponent implements OnInit {
  public static COMPONENT_ID: string = 'brew-edit';
  @ViewChild('brewBrewing', { read: BrewBrewingComponent, static: false })
  public brewBrewing: BrewBrewingComponent;
  public data: Brew = new Brew();
  public settings: Settings;
  public showFooter: boolean = true;
  constructor(
    private readonly modalController: ModalController,
    private readonly navParams: NavParams,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly uiHelper: UIHelper,
    private readonly uiToast: UIToast,
    private readonly platform: Platform,
    private readonly uiBrewHelper: UIBrewHelper,
    private readonly brewTracking: BrewTrackingService,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly insomnia: Insomnia,
    private readonly bleManager: CoffeeBluetoothDevicesService
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const brew: IBrew = this.uiHelper.copyData(this.navParams.get('brew'));

    if (brew !== undefined) {
      this.data.initializeByObject(brew);
    }
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
    if (this.settings.wake_lock) {
      this.insomnia.keepAwake().then(
        () => {},
        () => {}
      );
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

  public dismiss(): void {
    this.stopScaleTimer();
    try {
      Plotly.purge('flowProfileChart');
    } catch (ex) {}
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewEditComponent.COMPONENT_ID
    );
  }
  private stopScaleTimer() {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale) {
      scale.setTimer(SCALE_TIMER_COMMAND.STOP);
    }
  }

  public async updateBrew() {
    const newUnix = moment(this.brewBrewing.customCreationDate).unix();
    if (newUnix !== this.data.config.unix_timestamp) {
      this.data.config.unix_timestamp = newUnix;
    }
    this.uiBrewHelper.cleanInvisibleBrewData(this.data);

    if (
      this.brewBrewing.flow_profile_raw.weight.length > 0 ||
      this.brewBrewing.flow_profile_raw.pressureFlow.length > 0 ||
      this.brewBrewing.flow_profile_raw.temperatureFlow.length > 0
    ) {
      const savedPath = this.brewBrewing.saveFlowProfile(this.data.config.uuid);
      this.data.flow_profile = savedPath;
    }

    await this.uiBrewStorage.update(this.data);

    this.brewTracking.trackBrew(this.data);

    this.uiToast.showInfoToast('TOAST_BREW_EDITED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      BREW_TRACKING.TITLE,
      BREW_TRACKING.ACTIONS.EDIT_FINISH
    );
    this.dismiss();
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

  public ngOnInit() {
    this.uiAnalytics.trackEvent(
      BREW_TRACKING.TITLE,
      BREW_TRACKING.ACTIONS.EDIT
    );
  }
}
