import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';

import {
  IonButton,
  IonChip,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonRow,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bluetoothOutline } from 'ionicons/icons';

import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { Subscription } from 'rxjs';

import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { BrewFlow } from '../../../classes/brew/brewFlow';
import { ReferenceGraph } from '../../../classes/brew/referenceGraph';
import {
  BluetoothScale,
  SCALE_TIMER_COMMAND,
  sleep,
} from '../../../classes/devices';
import { Mill } from '../../../classes/mill/mill';
import { Preparation } from '../../../classes/preparation/preparation';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { XeniaDevice } from '../../../classes/preparationDevice/xenia/xeniaDevice';
import { Settings } from '../../../classes/settings/settings';
import { storedOrReported } from '../../../classes/storedOrReported';
import { BrewBrewingComponent } from '../../../components/brews/brew-brewing/brew-brewing.component';
import { HeaderButtonComponent } from '../../../components/header/header-button.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { DisableDoubleClickDirective } from '../../../directive/disable-double-click.directive';
import { AppEventType } from '../../../enums/appEvent/appEvent';
import { REFERENCE_GRAPH_TYPE } from '../../../enums/brews/referenceGraphType';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes'; // Added import
import { VoiceOverMagicTap } from '../../../native/voice-over-magic-tap-plugin';
import { BrewTrackingService } from '../../../services/brewTracking/brew-tracking.service';
import {
  CoffeeBluetoothDevicesService,
  CoffeeBluetoothServiceEvent,
} from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { injectDiscardGuard } from '../../../services/discardGuard/discard-guard';
import { HapticService } from '../../../services/hapticService/haptic.service';
import { EventQueueService } from '../../../services/queueService/queue-service.service';
import { speechLanguageTag } from '../../../services/textToSpeech/speech-options';
import { TextToSpeechService } from '../../../services/textToSpeech/text-to-speech.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIHealthKit } from '../../../services/uiHealthKit';
import { UIHelper } from '../../../services/uiHelper';
import { UILog } from '../../../services/uiLog';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';
import { VisualizerService } from '../../../services/visualizerService/visualizer-service.service';
import {
  brewFormChanged,
  BrewFormState,
  brewFormState,
  flowPoints,
} from '../../../stores/brews/brew-form-rules';
import {
  magicTapAction,
  spokenGrams,
  spokenStopTime,
} from '../../../stores/brews/magic-tap-rules';
import { SettingsPopoverBluetoothActionsComponent } from '../../settings/settings-popover-bluetooth-actions/settings-popover-bluetooth-actions.component';

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
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    BrewBrewingComponent,
    DisableDoubleClickDirective,
    TranslatePipe,
    IonHeader,
    IonButton,
    IonIcon,
    IonChip,
    IonContent,
    IonFooter,
    IonRow,
    IonCol,
    HeaderComponent,
    HeaderDismissButtonComponent,
    HeaderButtonComponent,
  ],
})
export class BrewAddComponent implements OnDestroy {
  private readonly modalController = inject(ModalController);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiToast = inject(UIToast);
  private readonly uiLog = inject(UILog);
  private readonly uiBrewHelper = inject(UIBrewHelper);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
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
  private readonly elementRef = inject(ElementRef);
  private readonly textToSpeech = inject(TextToSpeechService);
  private readonly translate = inject(TranslateService);
  private magicTapActive = false;
  private magicTapBusy = false;

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
  private brewUuid: string | undefined;

  public showFooter: boolean = true;
  private formStart: BrewFormState | undefined;
  private enteredWhileLoading = false;
  private readonly discardGuard = injectDiscardGuard({
    question: 'PAGE_BREW_DISCARD_CONFIRM',
    changed: () => this.formChanged(),
    close: () => this.dismiss(),
  });
  public bluetoothSubscription: Subscription = undefined;
  public automaticSaveSubscription: Subscription = undefined;
  public closeBrewScreenSubscription: Subscription = undefined;

  public readonly PreparationDeviceType = PreparationDeviceType;

  constructor() {
    addIcons({ bluetoothOutline });
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

    const eventCloseScreen = this.eventQueue.on(AppEventType.CLOSE_BREW_SCREEN);
    this.closeBrewScreenSubscription = eventCloseScreen.subscribe((event) => {
      this.dismiss();
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
    this.setMagicTapEnabled(true);
    this.uiAnalytics.trackEvent(BREW_TRACKING.TITLE, BREW_TRACKING.ACTIONS.ADD);
    if (this.settings.wake_lock) {
      this.uiHelper.deviceKeepAwake();
    }

    /**
     * We don'T need to await here, because the coordinates are set in the background
     */
    this.setCoordinates(true);

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

  public brewLoaded(): void {
    this.formStart = this.formState();
  }

  // Typing and choosing fire these events, values set by the form do not.
  @HostListener('input')
  @HostListener('ionChange')
  public noteInput(): void {
    if (this.formStart === undefined) {
      this.enteredWhileLoading = true;
    }
  }

  private formState(): BrewFormState {
    return brewFormState(
      this.data,
      this.brewBrewing?.brewBrewingGraphEl?.flow_profile_raw,
    );
  }

  private formChanged(): boolean {
    return brewFormChanged(this.formStart, this.formState(), {
      timerRunning: this.brewBrewing?.timer?.isTimerRunning() === true,
      enteredWhileLoading: this.enteredWhileLoading,
    });
  }

  public confirmDismiss(): Promise<void> {
    return this.discardGuard.confirmDismiss();
  }

  public ionViewWillLeave() {
    this.setMagicTapEnabled(false);
    if (this.settings.wake_lock) {
      this.uiHelper.deviceAllowSleepAgain();
    }
  }

  private setMagicTapEnabled(enabled: boolean): void {
    this.magicTapActive = enabled;
    if (Capacitor.getPlatform() === 'ios') {
      void VoiceOverMagicTap.setEnabled({ enabled }).catch((error) => {
        console.error('Could not update VoiceOver Magic Tap', error);
      });
    }
  }

  @HostListener('window:voiceOverMagicTap')
  public async handleVoiceOverMagicTap(): Promise<void> {
    if (!this.magicTapActive || this.magicTapBusy || !this.brewBrewing?.timer) {
      return;
    }
    this.magicTapBusy = true;
    try {
      const topModal = await this.modalController.getTop();
      const blockingOverlay = Array.from(
        document.querySelectorAll(
          'ion-alert, ion-action-sheet, ion-popover, ion-loading, ion-picker',
        ),
      ).some((overlay) => !overlay.classList.contains('overlay-hidden'));
      if (
        !this.magicTapActive ||
        topModal?.querySelector('brew-add') !== this.elementRef.nativeElement ||
        blockingOverlay
      ) {
        return;
      }

      const timer = this.brewBrewing.timer;
      const action = magicTapAction({
        running: timer.isTimerRunning(),
        seconds: timer.getSeconds(),
        milliseconds: timer.getMilliseconds(),
        flowPoints: flowPoints(
          this.brewBrewing.brewBrewingGraphEl?.flow_profile_raw,
        ),
      });
      if (action === 'stop') {
        // Pausing says the brew end first, so this follows it.
        timer.pauseTimer('click');
        this.speakMagicTapStop(timer.getSeconds());
        return;
      }
      if (action === 'resetAndStart') {
        timer.resetWithoutEmit();
        await this.brewBrewing.timerReset(undefined);
      }
      if (this.magicTapActive && !timer.isTimerRunning()) {
        await this.brewBrewing.timerStartPressed(undefined);
        if (timer.isTimerRunning()) {
          this.textToSpeech.speakInFull(
            this.translate.instant(
              action === 'start'
                ? 'TEXT_TO_SPEECH.MAGIC_TAP_STARTED'
                : 'TEXT_TO_SPEECH.MAGIC_TAP_RESET_AND_STARTED',
            ),
          );
        }
      }
    } finally {
      this.magicTapBusy = false;
    }
  }

  private speakMagicTapStop(seconds: number): void {
    const time = spokenStopTime(seconds);
    let grams: number | undefined;
    try {
      grams = this.bleManager.getScale()?.getWeight();
    } catch {
      // The scale went away: the time alone is said.
    }
    this.textToSpeech.speakInFull(
      grams === undefined
        ? this.translate.instant('TEXT_TO_SPEECH.MAGIC_TAP_STOPPED', { time })
        : this.translate.instant(
            'TEXT_TO_SPEECH.MAGIC_TAP_STOPPED_WITH_WEIGHT',
            {
              time,
              weight: spokenGrams(
                grams,
                speechLanguageTag(this.settings.language),
              ),
            },
          ),
    );
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
      // Without the values: the user can export the log and send it on.
      this.uiLog.info('BREW - Coordinates found');
    } catch (error) {
      this.uiLog.error('BREW - No Coordinates found', error);
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
      // One sheet size only: the drag handle cannot change anything, so it stays
      // out of the tab order (Ionic 9 makes it a keyboard stop by default).
      handleBehavior: 'none',
      initialBreakpoint: 0.5,
    });
    await popover.present();
    await popover.onWillDismiss();
  }

  public async dismiss() {
    this.stopScaleTimer();
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

      // The brew is complete before it is stored, so the brew collection is
      // written once. Its flow profile files are named after it, so the uuid
      // is fixed beforehand: once for the form, so another try after a failed
      // save writes the same files again instead of leaving them behind.
      this.brewUuid ??= crypto.randomUUID();
      const uuid = this.brewUuid;
      this.uiLog.log('Brew add - Step 3');
      await this.manageFlowProfile(uuid);

      this.uiLog.log('Brew add - Step 4');
      let addedBrewObj: Brew;
      if (
        !(await storedOrReported(this.uiAlert, async () => {
          const added = await this.uiBrewStorage.addAndConfirm(this.data, {
            uuid,
            unix_timestamp: this.getCustomBrewTime(),
          });
          addedBrewObj = added.entry;
          if (!added.saved) {
            // Before the message, which would wait behind the spinner.
            await this.uiAlert.hideLoadingSpinner();
          }
          return added.saved;
        }))
      ) {
        // The form stays open with what was entered.
        return;
      }

      void this.uiPreparationHelper.doMachineSpecificSyncs(addedBrewObj);

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
              BEAN_TRACKING.ACTIONS.BREW_TRACKED.TITLE +
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
              BEAN_TRACKING.ACTIONS.BREW_TRACKED.TITLE +
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
            this.uiLog.log('We could not get the logs from xenia', ex);
            this.uiToast.showInfoToast(
              'PREPARATION_DEVICE.TYPE_XENIA.LOGS_COULD_NOT_BE_LOADED',
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

  /** Undefined stores the brew with the time it is saved. */
  private getCustomBrewTime(): number | undefined {
    const checkData = this.getSettingsOrPreparation();

    if (checkData.manage_parameters.set_custom_brew_time) {
      this.uiLog.log('Brew add - Step 6');
      return moment(this.brewBrewing.customCreationDate).unix();
    }
    return undefined;
  }

  private getSettingsOrPreparation(): Settings | Preparation {
    if (this.getPreparation().use_custom_parameters === true) {
      return this.getPreparation();
    } else {
      return this.settings;
    }
  }

  /**
   * Writes the flow profile files of the brew to be stored under `_uuid` and
   * sets their paths on it. A failure here never keeps the brew from being
   * stored, as before, when the files were written after it was.
   */
  private async manageFlowProfile(_uuid: string) {
    try {
      if (this.hasAnyFlowProfileRequisites()) {
        this.uiLog.log('Brew add - Step 5');
        const savedPath: string = await this.brewBrewing.saveFlowProfile(_uuid);
        if (savedPath !== '') {
          this.data.flow_profile = savedPath;
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
          this.data.reference_flow_profile.type === REFERENCE_GRAPH_TYPE.NONE
        ) {
          await this.brewBrewing.saveReferenceFlowProfile(_uuid);

          this.data.reference_flow_profile = new ReferenceGraph();
          this.data.reference_flow_profile.type =
            REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH;
          this.data.reference_flow_profile.uuid = _uuid;
        }
      }
    } catch (ex) {
      this.uiLog.error('Brew add - Flow profile could not be saved', ex);
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

      //Don't ask we why we sleep here, but looks like we need it
      await sleep(100);
    }
  }

  public getPreparation(): Preparation {
    return this.uiPreparationStorage.getByUUID(this.data.method_of_preparation);
  }

  public deattachBrewAutoSave() {
    if (this.automaticSaveSubscription) {
      this.automaticSaveSubscription.unsubscribe();
      this.automaticSaveSubscription = undefined;
    }
  }

  public ngOnDestroy() {
    this.setMagicTapEnabled(false);
    if (this.bluetoothSubscription) {
      this.bluetoothSubscription.unsubscribe();
      this.bluetoothSubscription = undefined;
    }
    if (this.closeBrewScreenSubscription) {
      this.closeBrewScreenSubscription.unsubscribe();
      this.closeBrewScreenSubscription = undefined;
    }
    if (this.automaticSaveSubscription) {
      this.automaticSaveSubscription.unsubscribe();
      this.automaticSaveSubscription = undefined;
    }

    this.deattachBrewAutoSave();
  }
}
