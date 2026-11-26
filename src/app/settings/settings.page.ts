import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AlertController,
  CheckboxCustomEvent,
  IonAccordion,
  IonAccordionGroup,
  IonBackButton,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardTitle,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRange,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  ModalController,
  Platform,
  ScrollDetail,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bluetoothOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  cloudUploadOutline,
  flashOutline,
  informationCircleOutline,
  informationOutline,
  listOutline,
  refreshOutline,
} from 'ionicons/icons';

import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { CapacitorHttp } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Geolocation } from '@capacitor/geolocation';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { RefractometerDevice } from 'src/classes/devices/refractometerBluetoothDevice';
import { AppEvent } from '../../classes/appEvent/appEvent';
import { Bean } from '../../classes/bean/bean';
import BaristamodeBrew from '../../classes/brew/baristamodeBrew';
import { Brew } from '../../classes/brew/brew';
import { BrewFlow } from '../../classes/brew/brewFlow';
import { BluetoothScale, BluetoothTypes, sleep } from '../../classes/devices';
import { Logger } from '../../classes/devices/common/logger';
import { Graph } from '../../classes/graph/graph';
import { GreenBean } from '../../classes/green-bean/green-bean';
import { Mill } from '../../classes/mill/mill';
import { Preparation } from '../../classes/preparation/preparation';
import { PreparationDeviceType } from '../../classes/preparationDevice';
import { RoastingMachine } from '../../classes/roasting-machine/roasting-machine';
import { buildWebhookHeaders } from '../../classes/settings/brewByWeightWebhook';
import { Settings } from '../../classes/settings/settings';
import { Water } from '../../classes/water/water';
import { CloudModelPickerComponent } from '../../components/cloud-model-picker/cloud-model-picker.component';
import { HeaderComponent } from '../../components/header/header.component';
import { DEFAULT_GRAPH_COLORS } from '../../data/defaultGraphColors';
import SETTINGS_TRACKING from '../../data/tracking/settingsTracking';
import { ControlDescriptionDirective } from '../../directive/control-description.directive';
import { RangeNameDirective } from '../../directive/range-name.directive';
import { SelectLabelDirective } from '../../directive/select-label.directive';
import { TabPanelDirective } from '../../directive/tab-panel.directive';
import { TooltipDirective } from '../../directive/tooltip.directive';
import { AppEventType } from '../../enums/appEvent/appEvent';
import { BREW_DISPLAY_IMAGE_TYPE } from '../../enums/brews/brewDisplayImageType';
import { BREW_GRAPH_TYPE } from '../../enums/brews/brewGraphType';
import { REFERENCE_GRAPH_TYPE } from '../../enums/brews/referenceGraphType';
import { AI_PROVIDER_ENUM } from '../../enums/settings/aiProvider';
import { BREW_VIEW_ENUM } from '../../enums/settings/brewView';
import { TEST_TYPE_ENUM } from '../../enums/settings/refractometer';
import { STARTUP_VIEW_ENUM } from '../../enums/settings/startupView';
import { STATISTIC_BEAN_DATE_FIELD_ENUM } from '../../enums/settings/statisticBeanDateField';
import { THEME_MODE_ENUM } from '../../enums/settings/themeMode';
import { VISUALIZER_SERVER_ENUM } from '../../enums/settings/visualizerServer';
import { WEBHOOK_AUTH_TYPE_ENUM } from '../../enums/settings/webhookAuthType';
import { environment } from '../../environments/environment';
import { IBean } from '../../interfaces/bean/iBean';
import { IBrew } from '../../interfaces/brew/iBrew';
import { IGreenBean } from '../../interfaces/green-bean/iGreenBean';
import { IMill } from '../../interfaces/mill/iMill';
import { IPreparation } from '../../interfaces/preparation/iPreparation';
import { IRoastingMachine } from '../../interfaces/roasting-machine/iRoastingMachine';
import { IGraphColors } from '../../interfaces/settings/iGraphColors';
import { ISettings } from '../../interfaces/settings/iSettings';
import { AndroidNativeCalls } from '../../native/android-native-calls-plugin';
import { KeysPipe } from '../../pipes/keys';
import { ToFixedPipe } from '../../pipes/toFixed';
import { AnalyticsPopoverComponent } from '../../popover/analytics-popover/analytics-popover.component';
import { BluetoothDeviceChooserPopoverComponent } from '../../popover/bluetooth-device-chooser-popover/bluetooth-device-chooser-popover.component';
import { SettingsChooseAutomaticBackupToImportComponent } from '../../popover/settings-choose-automatic-backup-to-import/settings-choose-automatic-backup-to-import.component';
import {
  backupFormatProblem,
  NotABackupError,
  splitExportPartProblem,
} from '../../services/backup-format-rules';
import { BrewReferencesService } from '../../services/brewReferences/brew-references.service';
import { CoffeeBluetoothDevicesService } from '../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { CurrencyService } from '../../services/currencyService/currency.service';
import { PreImportBackupError } from '../../services/preImportBackup/pre-import-backup.service';
import { EventQueueService } from '../../services/queueService/queue-service.service';
import { TextToSpeechService } from '../../services/textToSpeech/text-to-speech.service';
import { ThemeService } from '../../services/theme/theme.service';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBaristamodeBrewStorage } from '../../services/uiBaristamodeBrewStorage';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIExcel } from '../../services/uiExcel';
import {
  importFailureCause,
  ImportNotRolledBackError,
  UIExportImportHelper,
} from '../../services/uiExportImportHelper';
import {
  CreateTempCacheDirectoryResult,
  UIFileHelper,
} from '../../services/uiFileHelper';
import { UIGraphStorage } from '../../services/uiGraphStorage.service';
import { UIGreenBeanStorage } from '../../services/uiGreenBeanStorage';
import { UIHealthKit } from '../../services/uiHealthKit';
import { UIHelper } from '../../services/uiHelper';
import { UILog } from '../../services/uiLog';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UIRoastingMachineStorage } from '../../services/uiRoastingMachineStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIToast } from '../../services/uiToast';
import { UIUpdate } from '../../services/uiUpdate';
import { UiVersionStorage } from '../../services/uiVersionStorage';
import { UIWaterStorage } from '../../services/uiWaterStorage';
import { VisualizerService } from '../../services/visualizerService/visualizer-service.service';
import { StoreHub } from '../../stores/core/store-hub';

@Component({
  selector: 'settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TabPanelDirective,
    FormsModule,
    TooltipDirective,
    DecimalPipe,
    TranslatePipe,
    KeysPipe,
    ToFixedPipe,
    HeaderComponent,
    IonHeader,
    IonBackButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardContent,
    IonCardTitle,
    IonItem,
    IonIcon,
    IonSelect,
    SelectLabelDirective,
    IonSelectOption,
    IonRange,
    RangeNameDirective,
    IonCheckbox,
    ControlDescriptionDirective,
    IonInput,
    IonTextarea,
    IonButton,
    IonNote,
    IonList,
    IonBadge,
    IonAccordionGroup,
    IonAccordion,
  ],
})
export class SettingsPage {
  protected readonly platform = inject(Platform);
  uiSettingsStorage = inject(UISettingsStorage);
  uiHelper = inject(UIHelper);
  private readonly alertCtrl = inject(AlertController);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiBaristamodeBrewStorage = inject(UIBaristamodeBrewStorage);
  private readonly uiGraphStorage = inject(UIGraphStorage);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiLog = inject(UILog);
  private readonly translate = inject(TranslateService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly androidPermissions = inject(AndroidPermissions);
  private readonly uiUpdate = inject(UIUpdate);
  private readonly brewReferences = inject(BrewReferencesService);
  private readonly uiVersionStorage = inject(UiVersionStorage);
  private readonly uiExcel = inject(UIExcel);
  private readonly uiHealthKit = inject(UIHealthKit);
  private readonly modalCtrl = inject(ModalController);
  private readonly uiRoastingMachineStorage = inject(UIRoastingMachineStorage);
  private readonly uiGreenBeanStorage = inject(UIGreenBeanStorage);
  private readonly uiWaterStorage = inject(UIWaterStorage);
  private readonly bleManager = inject(CoffeeBluetoothDevicesService);
  private readonly uiToast = inject(UIToast);
  private readonly currencyService = inject(CurrencyService);
  private readonly eventQueue = inject(EventQueueService);
  private readonly uiFileHelper = inject(UIFileHelper);
  private readonly uiExportImportHelper = inject(UIExportImportHelper);
  private readonly storeHub = inject(StoreHub);
  private readonly visualizerService = inject(VisualizerService);
  private readonly textToSpeech = inject(TextToSpeechService);
  private readonly themeService = inject(ThemeService);

  public settings: Settings;

  public BREW_VIEWS = BREW_VIEW_ENUM;
  public STARTUP_VIEW = STARTUP_VIEW_ENUM;
  public debounceLanguageFilter: Subject<string> = new Subject<string>();
  public THEME_MODE = THEME_MODE_ENUM;

  public isHealthSectionAvailable = false;
  public readonly isTextToSpeechSectionAvailable = this.textToSpeech.available;
  /** The Android voice service takes about a second for every announcement. */
  public readonly isAndroidSpeechHintShown = this.platform.is('android');
  /** Development builds keep pitch and rate to try the voice without a screen reader. */
  public readonly isSpeechVoiceAdjustable = !environment.production;

  public currencies = {};

  public settings_segment = 'general';

  public visualizerServerEnum = VISUALIZER_SERVER_ENUM;
  public webhookAuthTypeEnum = WEBHOOK_AUTH_TYPE_ENUM;

  public aiProviderEnum = AI_PROVIDER_ENUM;

  public isScrolling: boolean = false;

  public readonly isAndroid: boolean;
  public readonly isIos: boolean;

  /** Photos and graph files the running export or import could not copy. */
  private filesNotCopied = 0;

  private __cleanupAttachmentData(
    _data: (
      IBean | IBrew | IMill | IPreparation | IGreenBean | IRoastingMachine
    )[],
  ): any {
    if (_data !== undefined && _data.length > 0) {
      for (const obj of _data) {
        obj.attachments = [];
      }
    }
  }

  private __cleanupImportSettingsData(_data: ISettings | any): void {
    // We need to remove the filter because of new data here.
    if (_data !== undefined) {
      _data.brew_filter = {};
      _data.brew_filter.ARCHIVED = this.settings.GET_BREW_FILTER();
      _data.brew_filter.OPEN = this.settings.GET_BREW_FILTER();

      _data.bean_filter = {};
      _data.bean_filter.OPEN = this.settings.GET_BEAN_FILTER();
      _data.bean_filter.ARCHIVED = this.settings.GET_BEAN_FILTER();
    }
  }

  constructor() {
    this.__initializeSettings();
    this.debounceLanguageFilter
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(() => {
        this.setLanguage();
      });

    this.currencies = this.currencyService.getCurrencies();

    this.uiHealthKit.isAvailable().then(
      () => {
        this.isHealthSectionAvailable = true;
      },
      () => {
        this.isHealthSectionAvailable = false;
      },
    );

    this.isAndroid =
      this.platform.is('capacitor') && this.platform.is('android');
    this.isIos = this.platform.is('capacitor') && this.platform.is('ios');
    addIcons({
      bluetoothOutline,
      checkmarkCircleOutline,
      chevronForwardOutline,
      cloudUploadOutline,
      flashOutline,
      informationCircleOutline,
      informationOutline,
      listOutline,
      refreshOutline,
    });
  }

  public handleScrollStart() {
    this.isScrolling = true;
  }

  public handleScroll(ev: CustomEvent<ScrollDetail>) {
    this.isScrolling = true;
  }

  public handleScrollEnd() {
    setTimeout(() => {
      this.isScrolling = false;
    }, 1000);
  }

  private async showBluetoothPopover(_type: BluetoothTypes) {
    const modal = await this.modalCtrl.create({
      component: BluetoothDeviceChooserPopoverComponent,
      id: BluetoothDeviceChooserPopoverComponent.POPOVER_ID,
      componentProps: { bluetoothTypeSearch: _type },
    });
    await modal.present();
    await modal.onWillDismiss();
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public async findAndConnectRefractometerDevice(_retry = false) {
    this.showBluetoothPopover(BluetoothTypes.TDS);
  }

  public async findAndConnectTemperatureDevice(_retry = false) {
    this.showBluetoothPopover(BluetoothTypes.TEMPERATURE);
  }

  public async findAndConnectPressureDevice(_retry = false) {
    this.showBluetoothPopover(BluetoothTypes.PRESSURE);
  }

  public async findAndConnectScale(_retry = false) {
    this.showBluetoothPopover(BluetoothTypes.SCALE);
  }

  public async disconnectDevice(_type: BluetoothTypes) {
    /** Its true, because we try to disconnect, and if this is not possible, we just still forgot the device**/
    let disconnected = true;

    if (_type === BluetoothTypes.SCALE) {
      this.eventQueue.dispatch(
        new AppEvent(AppEventType.BLUETOOTH_SCALE_DISCONNECT, undefined),
      );
      if (this.settings.scale_id !== '' && this.bleManager.getScale()) {
        disconnected = await this.bleManager.disconnect(this.settings.scale_id);
      }
      if (disconnected) {
        this.settings.scale_id = '';
        this.settings.scale_type = null;
      }
    } else if (_type === BluetoothTypes.PRESSURE) {
      this.eventQueue.dispatch(
        new AppEvent(
          AppEventType.BLUETOOTH_PRESSURE_DEVICE_DISCONNECT,
          undefined,
        ),
      );
      if (
        this.settings.pressure_id !== '' &&
        this.bleManager.getPressureDevice()
      ) {
        disconnected = await this.bleManager.disconnectPressureDevice(
          this.settings.pressure_id,
        );
      }

      if (disconnected) {
        this.settings.pressure_id = '';
        this.settings.pressure_type = null;
      }
    } else if (_type === BluetoothTypes.TEMPERATURE) {
      this.eventQueue.dispatch(
        new AppEvent(
          AppEventType.BLUETOOTH_TEMPERATURE_DEVICE_DISCONNECT,
          undefined,
        ),
      );
      if (
        this.settings.temperature_id !== '' &&
        this.bleManager.getTemperatureDevice()
      ) {
        disconnected = await this.bleManager.disconnectTemperatureDevice(
          this.settings.temperature_id,
        );
      }

      if (disconnected) {
        this.settings.temperature_id = '';
        this.settings.temperature_type = null;
      }
    } else if (_type === BluetoothTypes.TDS) {
      this.eventQueue.dispatch(
        new AppEvent(
          AppEventType.BLUETOOTH_REFRACTOMETER_DEVICE_DISCONNECT,
          undefined,
        ),
      );

      if (
        this.settings.refractometer_id !== '' &&
        this.bleManager.getRefractometerDevice()
      ) {
        disconnected = await this.bleManager.disconnectRefractometerDevice(
          this.settings.refractometer_id,
        );
      }

      if (disconnected) {
        this.settings.refractometer_id = '';
        this.settings.refractometer_type = null;
      }
    }

    if (disconnected) {
      await this.saveSettings();
    }
  }

  public async checkHealthPlugin() {
    // #200 - Didn't save the settings
    if (this.settings.track_caffeine_consumption) {
      return;
    }

    const choice = await this.uiAlert.showConfirm(
      'HEALTH_KIT_QUESTION_MESSAGE',
      'HEALTH_KIT_QUESTION_TITLE',
      true,
    );
    if (choice === 'YES') {
      this.uiHealthKit.requestAuthorization().then(
        async () => {
          // Allowed
          this.settings.track_caffeine_consumption = true;
          await this.saveSettings();
        },
        async () => {
          // Forbidden
          this.settings.track_caffeine_consumption = false;
          await this.saveSettings();
        },
      );
    } else {
      // choice === NO, disable again
      this.settings.track_caffeine_consumption = false;
      await this.saveSettings();
    }
  }

  public async checkCoordinates() {
    // Only ask for permissions when the geolocation feature is turned on and
    // the current platform is android.
    if (!this.settings.track_brew_coordinates || !this.platform.is('android')) {
      return;
    }

    try {
      const currentPermissions = await Geolocation.checkPermissions();
      if (currentPermissions.location === 'granted') {
        this.uiLog.info('Location permission is already granted.');
        return;
      }
      // TODO Capacitor migration: We should also handle the other possible
      // outcomes, see https://capacitorjs.com/docs/plugins/web#aliases
      // At the very least, we should display a message to the user.

      const requestResult = await Geolocation.requestPermissions({
        permissions: ['location'],
      });
      if (requestResult.location !== 'granted') {
        throw new Error(
          'Permission request did not work, maybe the user declined?',
        );
      }
    } catch (error) {
      this.uiLog.warn('Error obtaining location permission:', error);
    }
  }

  public async changeBrewRating() {
    // #379 - First save then reset filter ;)
    await this.saveSettings();
    this.settings.resetFilter();
  }

  public async changedBrewRatingBlur() {
    setTimeout(() => {
      const newRating = this.settings.brew_rating;

      const allBrewEntries = this.uiBrewStorage.getAllEntries();
      if (allBrewEntries.filter((e) => e.rating > newRating).length > 0) {
        // We have brews which have a higher rating and would be not displayed.
        this.uiAlert.showMessage(
          'PAGE_SETTINGS_BREW_RATING_CHANGED_BREWS_NOT_VISIBLE',
          'CARE',
          'CLOSE',
          true,
        );
      }
    }, 500);
  }

  public async changeBeanRating() {
    await this.saveSettings();
    this.settings.resetFilter();
  }

  public async changeBeanRatingBlur() {
    setTimeout(() => {
      const newRating = this.settings.bean_rating;

      const allBeanEntries = this.uiBeanStorage.getAllEntries();
      if (allBeanEntries.filter((e) => e.rating > newRating).length > 0) {
        // We have brews which have a higher rating and would be not displayed.
        this.uiAlert.showMessage(
          'PAGE_SETTINGS_BEAN_RATING_CHANGED_BEANS_NOT_VISIBLE',
          'CARE',
          'CLOSE',
          true,
        );
      }
    }, 500);
  }

  /**
   * @remarks
   * calls {@link saveSettings()}, then will attempt to update a connected device.
   *
   * @param update - the setting to update on the refractometer
   */
  public async attemptRefractometerUpdate(update: string) {
    await this.saveSettings();

    const refractometer: RefractometerDevice =
      this.bleManager.getRefractometerDevice();

    if (refractometer) {
      switch (update) {
        case 'test_type':
          refractometer.setTestType(this.settings.refractometer_test_type);
          break;
        case 'auto_test':
          refractometer.setAutoTest(this.settings.refractometer_auto_test);
          break;
        case 'test_number':
          refractometer.setTestNumber(this.settings.refractometer_test_number);
          break;
      }
    }
  }

  public async saveSettings() {
    this.changeDetectorRef.detectChanges();
    await this.uiSettingsStorage.saveSettings(this.settings);
  }

  public isAppleIntelligenceAvailable(): boolean {
    return this.platform.is('ios') && this.platform.is('capacitor');
  }

  public onAiProviderChanged(): void {
    this.settings.cloud_ai_api_key = '';
    this.settings.cloud_ai_model = '';
    this.settings.cloud_ai_base_url = '';
    this.saveSettings();
  }

  public getModelPlaceholder(): string {
    switch (this.settings.ai_provider) {
      case AI_PROVIDER_ENUM.OPENAI:
        return 'gpt-4o-mini';
      case AI_PROVIDER_ENUM.GOOGLE:
        return 'gemini-2.0-flash';
      case AI_PROVIDER_ENUM.ANTHROPIC:
        return 'claude-sonnet-4-20250514';
      case AI_PROVIDER_ENUM.MISTRAL:
        return 'mistral-small-latest';
      case AI_PROVIDER_ENUM.OPENROUTER:
        return 'openai/gpt-4o-mini';
      case AI_PROVIDER_ENUM.CUSTOM:
        return 'model-name';
      default:
        return '';
    }
  }

  public async openModelPicker() {
    const modal = await this.modalCtrl.create({
      component: CloudModelPickerComponent,
      id: CloudModelPickerComponent.COMPONENT_ID,
      componentProps: {
        provider: this.settings.ai_provider,
        apiKey: this.settings.cloud_ai_api_key,
        baseUrl: this.settings.cloud_ai_base_url,
      },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.modelId) {
      this.settings.cloud_ai_model = data.modelId;
      this.saveSettings();
    }
  }

  public async visualizerServerHasChanged() {
    if (this.settings.visualizer_server === VISUALIZER_SERVER_ENUM.VISUALIZER) {
      this.settings.visualizer_url = 'https://visualizer.coffee/';
    } else {
      if (!this.settings.visualizer_url.endsWith('/')) {
        this.settings.visualizer_url = this.settings.visualizer_url + '/';
      }
    }
  }

  public async checkVisualizerURL() {
    if (this.settings.visualizer_url === '') {
      this.settings.visualizer_url = 'https://visualizer.coffee/';
    }
    if (!this.settings.visualizer_url.endsWith('/')) {
      this.settings.visualizer_url = this.settings.visualizer_url + '/';
    }
  }

  public testSpeak() {
    this.textToSpeech.speakInFull('182.5', '28', '1072', '1.2', '0.1', '203.5');
  }

  public async uploadBrewsToVisualizer() {
    const brewEntries = this.uiBrewStorage.getAllEntries();
    const uploadShots = brewEntries.filter(
      (b) => b.flow_profile && !b.customInformation.visualizer_id,
    );
    let couldABrewNotBeUploaded = false;
    await this.uiAlert.showLoadingSpinner();
    for (const shot of uploadShots) {
      try {
        await this.visualizerService.uploadToVisualizer(shot, false);
      } catch (ex) {
        couldABrewNotBeUploaded = true;
      }
    }

    await this.uiAlert.hideLoadingSpinner();

    if (couldABrewNotBeUploaded) {
      this.uiAlert.showMessage(
        'VISUALIZER.NOT_ALL_SHOTS_UPLOADED',
        undefined,
        undefined,
        true,
      );
    } else {
      this.uiAlert.showMessage(
        'VISUALIZER.ALL_SHOTS_UPLOADED',
        undefined,
        undefined,
        true,
      );
    }
  }

  public howManyBrewsAreNotUploadedToVisualizer() {
    const brewEntries = this.uiBrewStorage.getAllEntries();
    return brewEntries.filter(
      (b) => b.flow_profile && !b.customInformation.visualizer_id,
    ).length;
  }

  public async resetFilter() {
    this.settings.resetFilter();
  }
  public async resetBeanSort() {
    this.settings.resetBeanSort();
  }

  public async fixWeightChangeMinFlowNumber() {
    //We need to trigger this, because the slider sometimes procudes values like 0.60000001, and we need to fix this before saving
    this.settings.bluetooth_scale_espresso_stop_on_no_weight_change_min_flow =
      this.uiHelper.toFixedIfNecessary(
        this.settings
          .bluetooth_scale_espresso_stop_on_no_weight_change_min_flow,
        2,
      );
  }

  public async toggleLog() {
    if (
      this.settings.scale_log === true ||
      this.settings.pressure_log === true ||
      this.settings.temperature_log === true ||
      this.settings.refractometer_log === true
    ) {
      Logger.enableLog();
    } else {
      Logger.disableLog();
    }
    await this.uiSettingsStorage.saveSettings(this.settings);
  }

  /** Consent is given in the question, so a tap leaves the checkbox as stored. */
  public async askAboutAnalytics(_event: CheckboxCustomEvent): Promise<void> {
    _event.target.checked = this.settings.matomo_analytics === true;
    await this.showAnalyticsInformation();
  }

  public async showAnalyticsInformation() {
    const modal = await this.modalCtrl.create({
      component: AnalyticsPopoverComponent,
      id: AnalyticsPopoverComponent.POPOVER_ID,
    });
    await modal.present();
    await modal.onWillDismiss();
  }

  public smartScaleConnected() {
    const scale: BluetoothScale = this.bleManager.getScale();
    return !!scale;
  }
  public smartScaleSupportsTwoWeight() {
    const scale: BluetoothScale = this.bleManager.getScale();
    if (scale?.supportsTwoWeights === true) {
      return true;
    }
    return false;
  }

  public languageChanged(_query): void {
    this.debounceLanguageFilter.next(_query);
  }

  public async themeModeChanged(event: any) {
    await sleep(150);
    await this.saveSettings();
    this.themeService.adjustTheme();
  }

  public setLanguage(): void {
    this.translate.use(this.settings.language);
    this.uiAnalytics.trackEvent(
      SETTINGS_TRACKING.TITLE,
      SETTINGS_TRACKING.ACTIONS.SET_LANGUAGE.CATEGORY,
      this.settings.language,
    );
    this.uiSettingsStorage.saveSettings(this.settings);
    this.uiHelper.setMomentLocale(this.settings.language);
  }

  public async import(): Promise<void> {
    if (!this.platform.is('capacitor')) {
      const element = document.createElement('div');
      element.innerHTML = '<input type="file" accept=".zip" id="importZip">';
      const fileInput = element.firstChild as HTMLInputElement;

      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) {
          return;
        }

        if (
          file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase() !==
          'zip'
        ) {
          void this.uiAlert.showMessage(
            this.translate.instant('INVALID_FILE_FORMAT'),
          );
          return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            await this.uiAlert.showLoadingSpinner();
            const arrayBuffer = reader.result as ArrayBuffer;
            const parsedJSON =
              await this.uiExportImportHelper.getJSONFromZIPArrayBufferContent(
                arrayBuffer,
              );
            await this.__importJSON(parsedJSON, '', file.name);
          } catch (error) {
            if (error instanceof NotABackupError) {
              await this.__refuseImport('IMPORT_NOT_A_BACKUP', error.message);
              return;
            }
            this.uiLog.error('Error while importing ZIP on web:', error);
            await this.uiAlert.hideLoadingSpinner();
            await this.uiAlert.showMessageWithDetails(
              'ERROR_ON_FILE_READING',
              error,
            );
          }
        };
        reader.readAsArrayBuffer(file);
      });

      fileInput.click();
      return;
    }

    this.uiAnalytics.trackEvent(
      SETTINGS_TRACKING.TITLE,
      SETTINGS_TRACKING.ACTIONS.IMPORT,
    );
    this.uiLog.log('Import real data');

    const { files: pickedFiles } = await FilePicker.pickFiles({ limit: 1 });

    if (!pickedFiles?.[0]?.path) {
      return;
    }
    const pickedFile = pickedFiles[0];
    if (
      !pickedFile.mimeType.includes('zip') &&
      !pickedFile.mimeType.includes('json')
    ) {
      await this.uiAlert.showMessage(
        this.translate.instant('INVALID_FILE_FORMAT'),
      );
      return;
    }

    const path = pickedFile.path;
    // path/uri post-processing
    let directoryUri = path.substring(0, path.lastIndexOf('/'));
    if (this.platform.is('android')) {
      // Until we package the additional files into the ZIP file, we just have
      // to always import from the external storage directory,
      // i.e. /sdcard/Android/com.beanconqueror.app/files/
      //
      // As an alternative, importFromDirectoryAndroid can be used, which
      // uses SAF to get all the other files as well.
      const result = await Filesystem.getUri({
        path: 'Download/Beanconqueror_export/',
        directory: Directory.External,
      });
      directoryUri = result.uri;
    }
    const importMode = pickedFile.mimeType.includes('zip') ? 'zip' : 'json';
    await this.doImport(importMode, path, directoryUri, pickedFile.name);
  }

  /** `fileName` is the name of the chosen file, see __importJSON(). */
  private async doImport(
    importMode: 'zip' | 'json',
    mainFileUri: string,
    directoryUri: string,
    fileName: string,
  ): Promise<void> {
    try {
      if (importMode === 'zip') {
        const zipContent =
          await this.uiFileHelper.readFileAsUint8Array(mainFileUri);
        const parsedJSON =
          await this.uiExportImportHelper.getJSONFromZIPArrayBufferContent(
            zipContent,
          );
        await this.__importJSON(parsedJSON, directoryUri, fileName);
      } else {
        // A Beanconqueror.json, as older versions exported it.
        const parsedJSON = await this.uiFileHelper.readJSONFile(mainFileUri);
        const partProblem = splitExportPartProblem(parsedJSON);
        if (partProblem !== null) {
          await this.__refuseImport('IMPORT_ONLY_PART_OF_BACKUP', partProblem);
          return;
        }
        await this.__importJSON(parsedJSON, directoryUri, fileName);
      }
    } catch (error) {
      if (error instanceof NotABackupError) {
        await this.__refuseImport('IMPORT_NOT_A_BACKUP', error.message);
        return;
      }
      this.uiLog.error(
        'Error while importing file',
        mainFileUri,
        'from directory',
        directoryUri,
        '; Error',
        error,
      );
      await this.uiAlert.showMessageWithDetails('ERROR_ON_FILE_READING', error);
    }
  }

  public async importFromDirectoryAndroid(): Promise<void> {
    const logTag = 'importFromDirectoryAndroid:';

    if (!this.isAndroid) {
      throw new Error(
        'importFromDirectoryAndroid is only available on Android',
      );
    }

    this.uiLog.info(logTag, 'Asking for SAF directory');
    const { safTreeUri } = await AndroidNativeCalls.pickDirectory({
      takePersistentPermissions: false,
    });
    this.uiLog.info(logTag, 'Got SAF tree Uri', safTreeUri);

    let cacheDir: CreateTempCacheDirectoryResult | undefined;
    try {
      await this.uiAlert.showLoadingSpinner();

      // Attempt to read the main import file from the SAF directory and only
      // proceed with copying the SAF directory to cache if the main file exists.
      const mainFileName = 'Beanconqueror.zip';
      const { exists } = await AndroidNativeCalls.fileExistsSaf({
        safTreeUri: safTreeUri,
        pathComponents: [mainFileName],
      });
      if (!exists) {
        await this.uiAlert.showMessage(
          this.translate.instant('FULL_IMPORT_FROM_DIRECTORY_FILE_NOT_FOUND', {
            fileName: mainFileName,
          }),
        );
        return;
      }

      // Create a cache directory to move the selected SAF directory content into.
      // This allows us to re-use the existing import logic that is common to
      // Android and iOS.
      cacheDir = await this.uiFileHelper.createTempCacheDirectory('safImport');
      await AndroidNativeCalls.copySafDirectoryToFileDirectory({
        fromSafTreeUri: safTreeUri,
        toDirectoryUri: cacheDir.uri,
      });

      await this.doImport(
        'zip',
        cacheDir.uri + '/' + mainFileName,
        cacheDir.uri,
        mainFileName,
      );
    } finally {
      try {
        if (cacheDir) {
          await Filesystem.rmdir({
            path: cacheDir.path,
            directory: cacheDir.directory,
            recursive: true,
          });
        }
      } catch (error) {
        this.uiLog.error(
          logTag,
          'Could not delete cache dir',
          cacheDir.path,
          '; Error',
          error,
        );
        // ignore
      }
      await this.uiAlert.hideLoadingSpinner();
    }
  }

  public async findAndImportAutomaticBackupFile() {
    const modal = await this.modalCtrl.create({
      component: SettingsChooseAutomaticBackupToImportComponent,
      id: SettingsChooseAutomaticBackupToImportComponent.POPOVER_ID,
      componentProps: {},
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (modalData?.data && modalData.data.choosenURI !== '') {
      const path = modalData.data.choosenURI;
      // path/uri post-processing
      let directoryUri = path.substring(0, path.lastIndexOf('/'));
      if (this.platform.is('android')) {
        // Until we package the additional files into the ZIP file, we just have
        // to always import from the external storage directory,
        // i.e. /sdcard/Android/com.beanconqueror.app/files/
        //
        // As an alternative, importFromDirectoryAndroid can be used, which
        // uses SAF to get all the other files as well.
        const result = await Filesystem.getUri({
          path: 'Download/Beanconqueror_export/',
          directory: Directory.External,
        });
        directoryUri = result.uri;
      }

      await this.doImport(
        'zip',
        path,
        directoryUri,
        path.substring(path.lastIndexOf('/') + 1),
      );
    }
  }

  public async exportToSafDirectoryAndroid(): Promise<void> {
    const logTag = 'exportToDirectoryAndroid:';

    if (!this.isAndroid) {
      throw new Error('exportToDirectoryAndroid is only available on Android');
    }

    this.uiLog.info(logTag, 'Asking for SAF directory');
    const { safTreeUri } = await AndroidNativeCalls.pickDirectory({
      takePersistentPermissions: false,
    });
    this.uiLog.info(logTag, 'Got SAF tree Uri', safTreeUri);

    let cacheDir: CreateTempCacheDirectoryResult | undefined;
    try {
      await this.uiAlert.showLoadingSpinner();

      const mainFileName = 'Beanconqueror.zip';
      const { exists } = await AndroidNativeCalls.fileExistsSaf({
        safTreeUri: safTreeUri,
        pathComponents: [mainFileName],
      });
      if (exists) {
        this.uiAlert.showMessage(
          this.translate.instant(
            'FULL_EXPORT_TO_DIRECTORY_FILE_ALREADY_EXISTS',
            {
              fileName: mainFileName,
            },
          ),
        );
        return;
      }

      // Create a cache directory to export to. Then a native method will be
      // used to move the contents to the SAF directory afterwards.
      // This allows us to re-use the existing export logic that is common to
      // Android and iOS.
      cacheDir = await this.uiFileHelper.createTempCacheDirectory('safExport');
      await this.exportToPath(
        { path: cacheDir.path, directory: cacheDir.directory },
        false,
      );
      await AndroidNativeCalls.moveFileDirectoryToSafDirectory({
        fromDirectoryUri: cacheDir.uri,
        toSafTreeUri: safTreeUri,
      });
      this.uiAlert.showMessage(
        this.translate.instant(
          this.filesNotCopied > 0 ? 'FILES_NOT_COPIED' : 'EXPORT_COMPLETED',
          { count: this.filesNotCopied },
        ),
      );
    } finally {
      try {
        if (cacheDir) {
          await Filesystem.rmdir({
            path: cacheDir.path,
            directory: cacheDir.directory,
            recursive: true,
          });
        }
      } catch (error) {
        this.uiLog.error(
          logTag,
          'Could not delete cache dir',
          cacheDir.path,
          '; Error',
          error,
        );
        // ignore
      }
      if (this.uiAlert.isLoadingSpinnerShown) {
        this.uiAlert.hideLoadingSpinner();
      }
    }
  }

  private async exportAttachments(exportPath: {
    path: string;
    directory: Directory;
  }) {
    const exportObjects: any[] = [
      ...this.uiBeanStorage.getAllEntries(),
      ...this.uiBrewStorage.getAllEntries(),
      ...this.uiPreparationStorage.getAllEntries(),
      ...this.uiMillStorage.getAllEntries(),
      ...this.uiWaterStorage.getAllEntries(),
      ...this.uiGreenBeanStorage.getAllEntries(),
      ...this.uiRoastingMachineStorage.getAllEntries(),
    ];

    await this._exportAttachments(exportObjects, exportPath);
  }

  private async exportFlowProfiles(exportPath: {
    path: string;
    directory: Directory;
  }) {
    const exportObjects: any[] = [...this.uiBrewStorage.getAllEntries()];
    await this._exportFlowProfiles(exportObjects, exportPath);
  }

  private async exportGraphProfiles(exportPath: {
    path: string;
    directory: Directory;
  }) {
    const exportObjects: any[] = [...this.uiGraphStorage.getAllEntries()];
    await this._exportGraphProfiles(exportObjects, exportPath);
  }

  private async exportBaristamodeFlowProfiles(exportPath: {
    path: string;
    directory: Directory;
  }) {
    const exportObjects: any[] = [
      ...this.uiBaristamodeBrewStorage.getAllEntries(),
    ];
    await this.exportStoredData(exportObjects, exportPath);
  }

  public async export() {
    try {
      await this.uiAlert.withLoadingSpinner(async () => {
        // Do an export to the default export location
        const defaultExportPath = {
          path: 'Download/Beanconqueror_export',
          directory: Directory.External,
        };
        await this.exportToPath(defaultExportPath, true);
      });
    } finally {
      // Also when sharing the zip was cancelled: the files are missing all the same.
      await this.__reportFilesNotCopied();
    }
  }

  /** Tells how many photos and graph files the export or import could not copy. */
  private async __reportFilesNotCopied(): Promise<void> {
    if (this.filesNotCopied > 0) {
      await this.uiAlert.showMessage(
        this.translate.instant('FILES_NOT_COPIED', {
          count: this.filesNotCopied,
        }),
      );
    }
  }

  private async exportToPath(
    exportPath: {
      path: string;
      directory: Directory;
    },
    share: boolean,
  ) {
    this.uiLog.log(
      'Starting export to directory',
      exportPath.directory,
      'in directory',
      exportPath.directory,
    );

    this.uiAnalytics.trackEvent(
      SETTINGS_TRACKING.TITLE,
      SETTINGS_TRACKING.ACTIONS.EXPORT,
    );
    this.filesNotCopied = 0;

    const zipBlob = await this.uiExportImportHelper.buildExportZIP();

    // Export attachment files on android because they are stored in the
    // internal storage, which is not accessible for users.
    // On iOS this is not required because the attachments are stored in the
    // documents directory and are user-accessible anyway
    if (this.isAndroid) {
      await this.exportAttachments(exportPath);
      await this.exportFlowProfiles(exportPath);
      await this.exportGraphProfiles(exportPath);
      await this.exportBaristamodeFlowProfiles(exportPath);
    }

    await this.uiFileHelper.exportFile(
      {
        fileName: 'Beanconqueror.zip',
        path: exportPath.path,
        directory: exportPath.directory,
      },
      zipBlob,
      share,
    );
  }

  public excelExport(): void {
    this.uiExcel.export();
  }

  public pinFormatter(value: any) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return `${0}`;
    }
    const newValue = +parsedFloat.toFixed(2);
    return `${newValue}`;
  }

  public doWeHaveBrewByWeights(_type: string): boolean {
    const allPreparations = this.uiPreparationStorage.getAllEntries();
    for (const prep of allPreparations) {
      if (
        _type === 'xenia' &&
        prep.connectedPreparationDevice.type === PreparationDeviceType.XENIA
      ) {
        return true;
      } else if (
        _type === 'sanremo' &&
        prep.connectedPreparationDevice.type ===
          PreparationDeviceType.SANREMO_YOU
      ) {
        return true;
      }
    }
  }

  public async exportBrewByWeight(_type: string) {
    await this.uiAlert.showLoadingSpinner();
    try {
      const allPreps = [];
      const allPreparations = this.uiPreparationStorage.getAllEntries();

      for (const prep of allPreparations) {
        if (
          _type === 'xenia' &&
          prep.connectedPreparationDevice.type === PreparationDeviceType.XENIA
        ) {
          allPreps.push(prep);
        } else if (
          _type === 'sanremo' &&
          prep.connectedPreparationDevice.type ===
            PreparationDeviceType.SANREMO_YOU
        ) {
          allPreps.push(prep);
        }
      }

      let allBrewsWithProfiles = [];

      if (_type === 'xenia') {
        allBrewsWithProfiles = this.uiBrewStorage
          .getAllEntries()
          .filter(
            (e) =>
              e.flow_profile !== null &&
              e.flow_profile !== undefined &&
              e.flow_profile !== '' &&
              allPreps.find(
                (pr) => pr.config.uuid === e.method_of_preparation,
              ) &&
              e.preparationDeviceBrew?.params?.brew_by_weight_active === true,
          );
      } else if (_type === 'sanremo') {
        allBrewsWithProfiles = this.uiBrewStorage
          .getAllEntries()
          .filter(
            (e) =>
              e.flow_profile !== null &&
              e.flow_profile !== undefined &&
              e.flow_profile !== '' &&
              allPreps.find(
                (pr) => pr.config.uuid === e.method_of_preparation,
              ) &&
              e.preparationDeviceBrew?.params &&
              e.preparationDeviceBrew.params.stopAtWeight > 0,
          );
      }

      const maxEntries = 200;
      // Just take 60, else the excel will be exploding.
      if (allBrewsWithProfiles.length > maxEntries) {
        allBrewsWithProfiles = allBrewsWithProfiles
          .reverse()
          .slice(0, maxEntries);
      }

      const allBrewFlows: { BREW: Brew; FLOW: BrewFlow }[] = [];
      for await (const brew of allBrewsWithProfiles) {
        const flow: BrewFlow = await this.readFlowProfile(brew);
        if (flow) {
          allBrewFlows.push({
            BREW: brew,
            FLOW: flow,
          });
        }
      }

      this.uiExcel.exportBrewByWeightsSmall(allBrewFlows);
    } catch (ex) {
      this.uiAlert.hideLoadingSpinner();
    }
  }

  public async readFlowProfile(_brew: Brew) {
    const flowProfilePath = 'brews/' + _brew.config.uuid + '_flow_profile.json';
    try {
      const jsonParsed =
        await this.uiFileHelper.readInternalJSONFile(flowProfilePath);
      return jsonParsed as BrewFlow;
    } catch (ex) {
      return null;
    }
  }

  public downloadImportExcelTemplates() {
    this.uiHelper.openExternalWebpage(
      'https://beanconqueror.gitbook.io/beanconqueror/resources/files',
    );
  }

  public async importBeansExcel(_type = 'roasted') {
    if (this.platform.is('capacitor')) {
      this.uiAnalytics.trackEvent(
        SETTINGS_TRACKING.TITLE,
        SETTINGS_TRACKING.ACTIONS.IMPORT,
      );
      this.uiLog.log('Import real data');
      const fileUri = await FilePicker.pickFiles({ limit: 1 });
      if (!fileUri.files?.[0]?.path) {
        return;
      }
      if (
        fileUri.files[0].mimeType.indexOf(
          'openxmlformats-officedocument.spreadsheetml.sheet',
        ) > 0
      ) {
        this.uiFileHelper.readFileAsUint8Array(fileUri.files[0].path).then(
          async (_arrayBuffer) => {
            if (_type === 'roasted') {
              this.uiExcel.importBeansByExcel(_arrayBuffer.buffer);
            } else {
              this.uiExcel.importGreenBeansByExcel(_arrayBuffer.buffer);
            }
          },
          () => {
            // Backup, maybe it was a .JSON?
          },
        );
      } else {
        this.uiAlert.showMessage(this.translate.instant('INVALID_FILE_FORMAT'));
      }
    } else {
      const element = document.createElement('div');
      element.innerHTML = '<input type="file" id="importBeansExcel">';
      const fileInput = element.firstChild as HTMLInputElement;

      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          if (_type === 'roasted') {
            this.uiExcel.importBeansByExcel(arrayBuffer);
          } else {
            this.uiExcel.importGreenBeansByExcel(arrayBuffer);
          }
        };
        reader.readAsArrayBuffer(file);
      });

      fileInput.click();
    }
  }

  private async _exportAttachments(
    _storedData:
      | Bean[]
      | Brew[]
      | Preparation[]
      | Mill[]
      | GreenBean[]
      | RoastingMachine[]
      | Water[],
    exportPath: {
      path: string;
      directory: Directory;
    },
  ) {
    for (const entry of _storedData) {
      for (const attachment of entry.attachments) {
        await this._exportFile(attachment, exportPath);
      }
    }
  }

  private async _exportFlowProfiles(
    _storedData: Brew[],
    exportPath: {
      path: string;
      directory: Directory;
    },
  ) {
    await this.exportStoredData(_storedData, exportPath);
  }

  private async _exportGraphProfiles(
    _storedData: Graph[],
    exportPath: {
      path: string;
      directory: Directory;
    },
  ) {
    await this.exportStoredData(_storedData, exportPath);
  }

  private async exportStoredData(
    _storedData: Brew[] | Graph[] | BaristamodeBrew[],
    exportPath: {
      path: string;
      directory: Directory;
    },
  ) {
    for (const entry of _storedData) {
      if (entry.flow_profile && entry.flow_profile.length) {
        await this._exportFile(entry.getGraphPath(), exportPath);
      }

      if (
        entry instanceof Brew &&
        entry.reference_flow_profile?.type ===
          REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH
      ) {
        await this._exportFile(
          entry.getGraphPath(BREW_GRAPH_TYPE.IMPORTED_GRAPH),
          exportPath,
        );
      }
    }
  }

  private async _exportFile(
    fileName: string,
    exportPath: {
      path: string;
      directory: Directory;
    },
  ) {
    try {
      const sourceFile = await this.uiFileHelper.resolvePhotoPath(fileName);
      const targetFile = `${exportPath.path}/${fileName}`;

      await this.uiFileHelper.makeParentDirs(targetFile, exportPath.directory);

      const copyResult = await Filesystem.copy({
        from: sourceFile,
        directory: this.uiFileHelper.getDataDirectory(),
        to: targetFile,
        toDirectory: exportPath.directory,
      });
      this.uiLog.info(
        'File',
        fileName,
        'exported successfully to',
        copyResult.uri,
      );
    } catch (error) {
      this.uiLog.error(
        'Error while exporting',
        fileName,
        error,
        '.The error will be ignored.',
      );
      this.filesNotCopied++;
    }
  }

  private async _importFiles(
    _storedData:
      | Bean[]
      | Brew[]
      | Preparation[]
      | Mill[]
      | GreenBean[]
      | RoastingMachine[]
      | Water[],
    _importDirectory: string,
  ) {
    for (const entry of _storedData) {
      for (const attachment of entry.attachments) {
        await this._importFile(attachment, _importDirectory);
      }
    }
  }

  private async _importFlowProfileFiles(
    _storedData: Brew[],
    _importDirectory: string,
  ) {
    for (const entry of _storedData) {
      if (entry.flow_profile && entry.flow_profile.length) {
        await this._importFile(entry.getGraphPath(), _importDirectory);
      }
      if (entry.reference_flow_profile) {
        if (
          entry.reference_flow_profile.type ===
          REFERENCE_GRAPH_TYPE.IMPORTED_GRAPH
        ) {
          /*If we have an imported graph, the uuid, is used with the importedGraph folder, because else we would not been able to store those graphs coming from e.g. visualizer.*/
          /** Making a new object for this seems to be like totaly overdrived **/
          await this._importFile(
            entry.getGraphPath(BREW_GRAPH_TYPE.IMPORTED_GRAPH),
            _importDirectory,
          );
        }
      }
    }
  }

  private async _importGraphProfileFiles(
    _storedData: Graph[],
    _importDirectory: string,
  ) {
    for (const entry of _storedData) {
      if (entry.flow_profile) {
        await this._importFile(entry.flow_profile, _importDirectory);
      }
    }
  }

  private async _importBaristamodeFlowProfileFiles(
    _storedData: BaristamodeBrew[],
    _importDirectory: string,
  ) {
    for (const entry of _storedData) {
      if (entry.flow_profile && entry.flow_profile.length) {
        await this._importFile(entry.getGraphPath(), _importDirectory);
      }
    }
  }

  private async _importFile(
    internalPathToImportTo: string,
    importDirectory: string,
  ) {
    try {
      internalPathToImportTo = this.uiFileHelper.normalizeFileName(
        internalPathToImportTo,
      );

      const fileToImport = importDirectory + '/' + internalPathToImportTo;
      const fileToImportExists = await this.uiFileHelper.fileExists({
        path: fileToImport,
      });
      if (!fileToImportExists) {
        this.uiLog.error(
          'File to import with internal path',
          internalPathToImportTo,
          'does not exist at',
          fileToImport,
          '; Skipping import.',
        );
        this.filesNotCopied++;
        // Just give up and try to import the other files
        return;
      }

      this.uiLog.info(
        'Importing to internal path',
        internalPathToImportTo,
        'from',
        fileToImport,
      );
      await this.uiFileHelper.makeParentDirsInternal(internalPathToImportTo);
      await Filesystem.copy({
        from: fileToImport,
        to: internalPathToImportTo,
        toDirectory: this.uiFileHelper.getDataDirectory(),
      });
    } catch (error) {
      // We never want to throw from this method. We always want to try importing
      // all the other files, so this global catch is important
      this.uiLog.error(
        'Import file error for file',
        internalPathToImportTo,
        'in path',
        importDirectory,
        '; Error:',
        error,
      );
      this.filesNotCopied++;
    }
  }

  /** Tells why the chosen file is not imported, before anything is asked. */
  private async __refuseImport(
    _messageKey: string,
    _problem: string,
  ): Promise<void> {
    this.uiLog.error(`Import - refused: ${_problem}`);
    await this.uiAlert.hideLoadingSpinner();
    await this.uiAlert.showMessageWithDetails(_messageKey, _problem);
  }

  /**
   * `_fileName` is the name of the backup file chosen, which the note about
   * the import keeps (UIExportImportHelper.importBackup).
   */
  private async __importJSON(
    _parsedJSON: any,
    _importDirectory: string,
    _fileName: string,
  ) {
    const formatProblem = backupFormatProblem(_parsedJSON);
    if (formatProblem !== null) {
      await this.__refuseImport('IMPORT_NOT_A_BACKUP', formatProblem);
      return;
    }
    try {
      const parsedContent = _parsedJSON;
      this.uiLog.log('Parsed import data successfully');
      const isIOS: boolean = this.platform.is('ios');
      // Set empty arrays if not existing.
      if (!parsedContent[this.uiPreparationStorage.getDBPath()]) {
        parsedContent[this.uiPreparationStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiBeanStorage.getDBPath()]) {
        parsedContent[this.uiBeanStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiBrewStorage.getDBPath()]) {
        parsedContent[this.uiBrewStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiSettingsStorage.getDBPath()]) {
        parsedContent[this.uiSettingsStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiRoastingMachineStorage.getDBPath()]) {
        parsedContent[this.uiRoastingMachineStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiGreenBeanStorage.getDBPath()]) {
        parsedContent[this.uiGreenBeanStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiWaterStorage.getDBPath()]) {
        parsedContent[this.uiWaterStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiVersionStorage.getDBPath()]) {
        parsedContent[this.uiVersionStorage.getDBPath()] = [];
      }
      if (!parsedContent[this.uiGraphStorage.getDBPath()]) {
        parsedContent[this.uiGraphStorage.getDBPath()] = [];
      }
      if (
        !parsedContent[this.uiPreparationStorage.getDBPath()] ||
        !parsedContent[this.uiBeanStorage.getDBPath()] ||
        !parsedContent[this.uiBrewStorage.getDBPath()] ||
        !parsedContent[this.uiSettingsStorage.getDBPath()]
      ) {
        await this.uiAlert.showMessage(
          this.translate.instant('INVALID_FILE_DATA'),
        );
        return;
      }

      this.uiLog.log('All data existing');
      this.__cleanupImportSettingsData(
        parsedContent[this.uiSettingsStorage.getDBPath()][0],
      );

      // When exporting the value is a number, when importing it needs to be  a string.
      parsedContent.SETTINGS[0].brew_view =
        parsedContent.SETTINGS[0].brew_view + '';
      this.uiLog.log('Cleaned all data');
      if (parsedContent.SETTINGS[0].brew_order?.before === undefined) {
        this.uiLog.log('Old brew order structure');
        // Breaking change, we need to throw away the old order types by import
        parsedContent.SETTINGS[0].brew_order = this.uiHelper.copyData(
          new Settings().brew_order,
        );
      }

      if (!(await this.__confirmImport())) {
        return;
      }
      await this.uiAlert.showLoadingSpinner();
      // A failure after the data was stored must not say that no data was
      // changed, or the file may be imported again.
      let phase = 'storing' as 'storing' | 'reloading' | 'reported';
      try {
        const _data = await this.storeHub.reload(async () => {
          const imported = await this.uiExportImportHelper.importBackup(
            parsedContent,
            'import',
            _fileName,
          );
          if (imported.BACKUP === false) {
            phase = 'reloading';
            await this.__reinitializeStorages();
          }
          return imported;
        });
        if (_data.BACKUP === false) {
          // Show loadingspinner again, because the reintializestorages hides it.
          await this.uiAlert.showLoadingSpinner();
          this.uiAnalytics.disableTracking();
          this.__initializeSettings();

          this.filesNotCopied = 0;
          if (!isIOS && this.platform.is('capacitor')) {
            const brewsData = this.uiBrewStorage.getAllEntries();
            const importAttachmentCollections = [
              brewsData,
              this.uiBeanStorage.getAllEntries(),
              this.uiPreparationStorage.getAllEntries(),
              this.uiMillStorage.getAllEntries(),
              this.uiGreenBeanStorage.getAllEntries(),
              this.uiRoastingMachineStorage.getAllEntries(),
              this.uiWaterStorage.getAllEntries(),
            ];

            for (const collection of importAttachmentCollections) {
              await this._importFiles(collection, _importDirectory);
            }

            await this._importFlowProfileFiles(brewsData, _importDirectory);

            const graphData = this.uiGraphStorage.getAllEntries();
            await this._importGraphProfileFiles(graphData, _importDirectory);

            const baristamodeBrewsData =
              this.uiBaristamodeBrewStorage.getAllEntries();
            await this._importBaristamodeFlowProfileFiles(
              baristamodeBrewsData,
              _importDirectory,
            );
          }

          await this.__addStandardMillAfterImport();
          this.setLanguage();

          if (
            this.settings.brew_rating_steps === null ||
            this.settings.brew_rating_steps === undefined
          ) {
            this.settings.brew_rating_steps = 1;
          }
          if (
            this.settings.bean_rating_steps === null ||
            this.settings.bean_rating_steps === undefined
          ) {
            this.settings.bean_rating_steps = 1;
          }
          this.settings.resetFilter();

          await this.uiSettingsStorage.saveSettings(this.settings);
          // Re-apply current theme after importing, as the import might contain
          // a theme setting different from the old one.
          await this.themeService.adjustTheme();

          await this.uiAlert.hideLoadingSpinner();
          await this.uiAlert.showMessage(
            this.translate.instant('IMPORT_SUCCESSFULLY'),
          );
          phase = 'reported';
          await this.__reportFilesNotCopied();
          if (this.settings.matomo_analytics === undefined) {
            await this.showAnalyticsInformation();
          } else {
            this.uiAnalytics.enableTracking();
          }
        } else {
          await this.uiAlert.hideLoadingSpinner();
          await this.uiAlert.showMessageWithDetails(
            'IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED',
            _data.cause,
          );
        }
      } catch (error) {
        this.uiLog.error('Error during import', error);
        await this.uiAlert.hideLoadingSpinner();
        if (phase === 'reported') {
          // The data is loaded and the success was shown already.
          return;
        }
        let message = 'IMPORT_UNSUCCESSFULLY_DATA_NOT_CHANGED';
        if (phase === 'reloading') {
          message = 'IMPORT_STORED_RELOAD_FAILED';
        } else if (error instanceof PreImportBackupError) {
          message = 'PRE_IMPORT_BACKUP_FAILED';
        } else if (error instanceof ImportNotRolledBackError) {
          message = error.messageKey;
        }
        await this.uiAlert.showMessageWithDetails(
          message,
          importFailureCause(error),
        );
      }
    } catch (ex) {
      this.uiLog.error('Import - invalid file data', ex);
      await this.uiAlert.showMessageWithDetails('INVALID_FILE_DATA', ex);
    }
  }

  /**
   * An import replaces all data, so it is confirmed first. The question
   * says where the current data is saved before (see
   * UIExportImportHelper.importBackup), or that nothing is saved in the
   * browser.
   */
  private async __confirmImport(): Promise<boolean> {
    // Reading the file may have shown the spinner; no spinner while the
    // question waits for an answer.
    await this.uiAlert.hideLoadingSpinner();
    const choice = await this.uiAlert.showConfirm(
      this.uiExportImportHelper.savesBackupBeforeImport()
        ? 'PRE_IMPORT_BACKUP_HINT'
        : 'PRE_IMPORT_BACKUP_HINT_BROWSER',
      'IMPORT_REPLACE_ALL_DATA_QUESTION',
      true,
    );
    return choice === 'YES';
  }

  /**
   * Imported brews need a mill. Pointing them at the standard mill is a
   * correction made by the app, not a user change, so the imported entries
   * keep the change info they came with.
   */
  private async __addStandardMillAfterImport(): Promise<void> {
    if (!(await this.brewReferences.addStandardMill())) {
      this.uiLog.error('Import - brews not pointed at the standard mill');
    }
  }

  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  /**
   * Reads every collection again after the stored data was replaced, also
   * after one that could not be read: one left with the entries from before
   * would store them over the new ones with its next write. Rejects when one
   * could not be read.
   */
  private async __reinitializeStorages(): Promise<any> {
    const notRead: string[] = [];
    for (const storage of [
      this.uiBeanStorage,
      this.uiPreparationStorage,
      this.uiSettingsStorage,
      this.uiBrewStorage,
      this.uiMillStorage,
      this.uiVersionStorage,
      this.uiGreenBeanStorage,
      this.uiRoastingMachineStorage,
      this.uiWaterStorage,
      this.uiGraphStorage,
      this.uiBaristamodeBrewStorage,
    ]) {
      await storage
        .reinitializeStorage()
        .catch(() => notRead.push(storage.getDBPath()));
    }
    if (notRead.length > 0) {
      throw new Error(
        `Settings - Import - not read again: ${notRead.join(', ')}`,
      );
    }
    this.uiExportImportHelper.allCollectionsRead();

    // Wait for every necessary service to be ready before starting the app
    // Settings and version, will create a new object on start, so we need to wait for this in the end.
    const beanStorageReadyCallback = this.uiBeanStorage.storageReady();
    const preparationStorageReadyCallback =
      this.uiPreparationStorage.storageReady();
    const uiSettingsStorageReadyCallback =
      this.uiSettingsStorage.storageReady();
    const brewStorageReadyCallback = this.uiBrewStorage.storageReady();
    const millStorageReadyCallback = this.uiMillStorage.storageReady();
    const versionStorageReadyCallback = this.uiVersionStorage.storageReady();
    const greenBeanStorageCallback = this.uiGreenBeanStorage.storageReady();
    const roastingMachineStorageCallback =
      this.uiRoastingMachineStorage.storageReady();
    const waterStorageCallback = this.uiWaterStorage.storageReady();
    const graphStorageCallback = this.uiGraphStorage.storageReady();
    const baristamodeBrewStorageCallback =
      this.uiBaristamodeBrewStorage.storageReady();

    await Promise.all([
      beanStorageReadyCallback,
      preparationStorageReadyCallback,
      brewStorageReadyCallback,
      uiSettingsStorageReadyCallback,
      millStorageReadyCallback,
      versionStorageReadyCallback,
      greenBeanStorageCallback,
      roastingMachineStorageCallback,
      waterStorageCallback,
      graphStorageCallback,
      baristamodeBrewStorageCallback,
    ]);
    await this.uiUpdate.checkUpdate(true);
  }

  public async checkVisualizerConnection() {
    if (await this.visualizerService.checkConnection()) {
      this.uiToast.showInfoToastBottom('VISUALIZER.CONNECTION.SUCCESSFULLY');
    } else {
      this.uiAlert.showMessage(
        'VISUALIZER.CONNECTION.UNSUCCESSFULLY',
        undefined,
        undefined,
        true,
      );
    }
  }

  /**
   * Users routinely omit the scheme when typing a LAN address like
   * "192.168.1.50/relay/0?turn=off". CapacitorHttp requires an absolute URL,
   * so normalise on blur. http:// is the correct default here because this
   * feature targets local smart plugs and relays, which rarely serve https.
   */
  public normalizeWebhookUrl(): void {
    const cfg = this.settings.brew_by_weight_webhook;
    const url = cfg?.url?.trim();
    if (!url || url.includes('://')) {
      return;
    }
    cfg.url = `http://${url}`;
    this.saveSettings();
  }

  public isWebhookUrlHttp(): boolean {
    return (
      this.settings.brew_by_weight_webhook?.url?.trim().startsWith('http://') ??
      false
    );
  }

  public async testBrewByWeightWebhook() {
    const url = this.settings.brew_by_weight_webhook?.url?.trim();
    if (!url) {
      return;
    }
    try {
      await CapacitorHttp.get({
        url,
        headers: buildWebhookHeaders(this.settings.brew_by_weight_webhook),
      });
      this.uiToast.showInfoToastBottom('BREW_BY_WEIGHT_WEBHOOK.TEST_SUCCESS');
    } catch (_err) {
      this.uiAlert.showMessage(
        'BREW_BY_WEIGHT_WEBHOOK.TEST_FAILED',
        undefined,
        undefined,
        true,
      );
    }
  }

  protected readonly BluetoothTypes = BluetoothTypes;
  protected readonly BREW_DISPLAY_IMAGE_TYPE = BREW_DISPLAY_IMAGE_TYPE;
  protected readonly TEST_TYPE_ENUM = TEST_TYPE_ENUM;
  protected readonly THEME_MODE_ENUM = THEME_MODE_ENUM;
  protected readonly STATISTIC_BEAN_DATE_FIELD_ENUM =
    STATISTIC_BEAN_DATE_FIELD_ENUM;

  public async resetGraphColor(graphType: keyof IGraphColors) {
    const choice = await this.uiAlert.showConfirm(
      'SURE_QUESTION',
      undefined,
      true,
    );
    if (choice !== 'YES') {
      return;
    }

    if (!this.settings.graph_colors) {
      this.settings.graph_colors = JSON.parse(
        JSON.stringify(DEFAULT_GRAPH_COLORS),
      );
    }

    if (DEFAULT_GRAPH_COLORS[graphType]) {
      this.settings.graph_colors[graphType] = JSON.parse(
        JSON.stringify(DEFAULT_GRAPH_COLORS[graphType]),
      );
      await this.saveSettings();
    }
  }
}

export default SettingsPage;
