import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonRange,
  IonSelect,
  IonSelectOption,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { BluetoothTypes } from '../../../classes/devices/types';
import { Preparation } from '../../../classes/preparation/preparation';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { GaggimateParams } from '../../../classes/preparationDevice/gaggimate/gaggimateDevice';
import { MeticulousParams } from '../../../classes/preparationDevice/meticulous/meticulousDevice';
import { Move2Params } from '../../../classes/preparationDevice/move2/move2Device';
import { PreparationDevice } from '../../../classes/preparationDevice/preparationDevice';
import { SanremoYOUParams } from '../../../classes/preparationDevice/sanremo/sanremoYOUDevice';
import { XeniaParams } from '../../../classes/preparationDevice/xenia/xeniaDevice';
import { Settings } from '../../../classes/settings/settings';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { environment } from '../../../environments/environment';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { BluetoothDeviceChooserPopoverComponent } from '../../../popover/bluetooth-device-chooser-popover/bluetooth-device-chooser-popover.component';
import { UIAlert } from '../../../services/uiAlert';
import { UIHelper } from '../../../services/uiHelper';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';

@Component({
  selector: 'app-preparation-connected-device',
  templateUrl: './preparation-connected-device.component.html',
  styleUrls: ['./preparation-connected-device.component.scss'],
  imports: [
    FormsModule,
    TranslatePipe,
    ToFixedPipe,
    IonHeader,
    IonContent,
    IonButton,
    IonIcon,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonCard,
    IonCardContent,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonInput,
    IonLabel,
    IonBadge,
    IonRange,
    IonCheckbox,
    IonFooter,
  ],
})
export class PreparationConnectedDeviceComponent {
  private readonly modalController = inject(ModalController);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly uiToast = inject(UIToast);
  private readonly uiAlert = inject(UIAlert);
  readonly uiHelper = inject(UIHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);

  public static readonly COMPONENT_ID = 'preparation-connected-device';
  public data: Preparation = new Preparation();
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public segment: string = 'manage';
  public PREPARATION_DEVICE_TYPE = PreparationDeviceType;
  @Input() public preparation: IPreparation;

  public ENVIRONMENT_PARAMS = environment;

  public pinFormatter(value: any) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return `${0}`;
    }
    const newValue = +parsedFloat.toFixed(2);
    return `${newValue}`;
  }
  constructor() {
    addIcons({ checkmarkCircleOutline });
  }

  public ionViewWillEnter(): void {
    if (this.preparation !== undefined) {
      this.data.initializeByObject(this.preparation);
    }
    if (
      this.data.connectedPreparationDevice.type === PreparationDeviceType.NONE
    ) {
      if (this.data.type === PREPARATION_TYPES.METICULOUS) {
        this.data.connectedPreparationDevice.type =
          PreparationDeviceType.METICULOUS;
        this.data.connectedPreparationDevice.customParams =
          new MeticulousParams();
      }
      if (this.data.type === PREPARATION_TYPES.XENIA) {
        this.data.connectedPreparationDevice.type = PreparationDeviceType.XENIA;
        this.data.connectedPreparationDevice.customParams = new XeniaParams();
      }
      if (this.data.type === PREPARATION_TYPES.SANREMO_YOU) {
        this.data.connectedPreparationDevice.type =
          PreparationDeviceType.SANREMO_YOU;
        this.data.connectedPreparationDevice.customParams =
          new SanremoYOUParams();
      }
      if (this.data.type === PREPARATION_TYPES.MOVE2) {
        this.data.connectedPreparationDevice.type = PreparationDeviceType.MOVE2;
        this.data.connectedPreparationDevice.customParams = new Move2Params();
      }
      if (this.data.type === PREPARATION_TYPES.GAGGIMATE) {
        this.data.connectedPreparationDevice.type =
          PreparationDeviceType.GAGGIMATE;
        this.data.connectedPreparationDevice.customParams =
          new GaggimateParams();
      }
    }
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      PreparationConnectedDeviceComponent.COMPONENT_ID,
    );
  }

  public deviceTypeChanged() {
    if (
      this.data.connectedPreparationDevice.type ===
      PreparationDeviceType.METICULOUS
    ) {
      this.data.connectedPreparationDevice.customParams =
        new MeticulousParams();
    } else if (
      this.data.connectedPreparationDevice.type === PreparationDeviceType.XENIA
    ) {
      this.data.connectedPreparationDevice.customParams = new XeniaParams();
    } else if (
      this.data.connectedPreparationDevice.type ===
      PreparationDeviceType.SANREMO_YOU
    ) {
      this.data.connectedPreparationDevice.customParams =
        new SanremoYOUParams();
    } else if (
      this.data.connectedPreparationDevice.type === PreparationDeviceType.MOVE2
    ) {
      this.data.connectedPreparationDevice.customParams = new Move2Params();
    } else if (
      this.data.connectedPreparationDevice.type ===
      PreparationDeviceType.GAGGIMATE
    ) {
      // this.data.connectedPreparationDevice.customParams =
      //   new GaggimateParams();
    } else if (
      this.data.connectedPreparationDevice.type ===
        PreparationDeviceType.NONE ||
      this.data.connectedPreparationDevice.type ===
        PreparationDeviceType.GAGGIUINO
    ) {
      this.data.connectedPreparationDevice.customParams = {};
    }
    this.save();
  }

  public async save(_checkURL: boolean = true) {
    setTimeout(async () => {
      if (_checkURL === true) {
        if (this.data.connectedPreparationDevice.url) {
          this.data.connectedPreparationDevice.url =
            this.data.connectedPreparationDevice.url.trim();
        }
        if (
          this.data.connectedPreparationDevice.type ===
          PreparationDeviceType.XENIA
        ) {
          if (this.data.connectedPreparationDevice.url === '') {
            this.data.connectedPreparationDevice.url = 'http://xenia.local';
          } else {
            this.data.connectedPreparationDevice.url = this.normalizeUrl(
              this.data.connectedPreparationDevice.url,
            );
          }
          if (
            this.data.connectedPreparationDevice.customParams.apiVersion ===
            undefined
          ) {
            this.data.connectedPreparationDevice.customParams.apiVersion = 'V2';
          }
          if (
            this.data.connectedPreparationDevice.customParams
              .residualLagTime === undefined ||
            this.data.connectedPreparationDevice.customParams
              .residualLagTime === 0
          ) {
            this.data.connectedPreparationDevice.customParams.residualLagTime = 1.35;
          }
        }
        if (
          this.data.connectedPreparationDevice.type ===
          PreparationDeviceType.METICULOUS
        ) {
          this.data.connectedPreparationDevice.url = this.normalizeUrl(
            this.data.connectedPreparationDevice.url,
          );
        }
        if (
          this.data.connectedPreparationDevice.type ===
          PreparationDeviceType.SANREMO_YOU
        ) {
          this.data.connectedPreparationDevice.url = this.normalizeUrl(
            this.data.connectedPreparationDevice.url,
          );
        }
        if (
          this.data.connectedPreparationDevice.type ===
          PreparationDeviceType.GAGGIUINO
        ) {
          this.data.connectedPreparationDevice.url = this.normalizeUrl(
            this.data.connectedPreparationDevice.url,
          );
        }
        if (
          this.data.connectedPreparationDevice.type ===
          PreparationDeviceType.MOVE2
        ) {
          if (
            this.data.connectedPreparationDevice.customParams
              .residualLagTime === undefined ||
            this.data.connectedPreparationDevice.customParams
              .residualLagTime === 0
          ) {
            this.data.connectedPreparationDevice.customParams.residualLagTime = 0.5;
          }
        }
        if (
          this.data.connectedPreparationDevice.type ===
          PreparationDeviceType.GAGGIMATE
        ) {
          // Check the device url format
          this.data.connectedPreparationDevice.url = this.normalizeUrl(
            this.data.connectedPreparationDevice.url,
          );
          if (
            this.data.connectedPreparationDevice.customParams
              .latestShotsToImport === undefined ||
            this.data.connectedPreparationDevice.customParams
              .latestShotsToImport === 0
          ) {
            this.data.connectedPreparationDevice.customParams.latestShotsToImport = 1;
          }
        }
      }
      if (
        this.data.connectedPreparationDevice.type !== PreparationDeviceType.NONE
      ) {
        /**
         * Activiate the automatic stop when you connect a portafilter connection
         */
        const settings: Settings = this.uiSettingsStorage.getSettings();
        settings.bluetooth_scale_espresso_stop_on_no_weight_change = true;
        settings.bluetooth_scale_stay_connected = true;
        settings.wake_lock = true;
        await this.uiSettingsStorage.update(settings);
      }
      await this.uiPreparationStorage.update(this.data);
      if (this.preparation) {
        (this.preparation as Preparation).initializeByObject(this.data);
      }
    }, 150);
  }

  /*  private normalizeUrl() {
    let url = this.data?.connectedPreparationDevice?.url;

    // if there's no url do nothing
    if (url) {
      url = url.trim();

      // If the protocol is missing, default to http://
      if (!/^https?:\/\//i.test(url)) {
        url = `http://${url}`;
      }

      if (/^https?:\/\/!*$/i.test(url)) {
        // If the address is incomplete (only protocol) set to empty string
        this.data.connectedPreparationDevice.url = '';
      } else if (/^https?:\/\/.+/i.test(url)) {
        // If the url starts with protocol and has a path, strip trailing slashes if any
        this.data.connectedPreparationDevice.url = url.replace(/\/+$/, '');
      }
    }
  }*/

  private normalizeUrl(inputUrl: string) {
    // const inputUrl = this.data?.connectedPreparationDevice?.url;

    const PROTOCOL_PATTERN = '(https?|wss?)';
    const HAS_PROTOCOL = new RegExp(`^${PROTOCOL_PATTERN}:\\/\\/`, 'i');
    const IS_INCOMPLETE = new RegExp(`^${PROTOCOL_PATTERN}:\\/*$`, 'i');

    // if there's no url do nothing
    if (!inputUrl) return '';

    let url = inputUrl.trim();

    // If missing protocol, default to http://
    if (!HAS_PROTOCOL.test(url)) {
      console.log('miss prot');
      url = `http://${url}`;
    }

    // If incomplete (only protocol), clear it
    if (IS_INCOMPLETE.test(url)) {
      console.log('inc prot');
      return '';
    }

    // Strip trailing slashes from valid URLs
    console.log('url ' + url.replace(/\/+$/, ''));
    return url.replace(/\/+$/, '');
  }

  public checkURL(): void {
    const connectedDevice: PreparationDevice =
      this.uiPreparationHelper.getConnectedDevice(this.data);
    if (connectedDevice) {
      connectedDevice.deviceConnected().then(
        () => {
          this.uiToast.showInfoToastBottom(
            'PREPARATION_DEVICE.CONNECTION.SUCCESFULLY',
          );
        },
        () => {
          this.uiAlert.showMessage(
            'PREPARATION_DEVICE.CONNECTION.UNSUCCESFULLY',
            undefined,
            undefined,
            true,
          );
        },
      );
    }
  }

  public async searchMachineDevice() {
    const modal = await this.modalController.create({
      component: BluetoothDeviceChooserPopoverComponent,
      id: BluetoothDeviceChooserPopoverComponent.POPOVER_ID,
      componentProps: { bluetoothTypeSearch: BluetoothTypes.MACHINE },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data?.device) {
      this.data.connectedPreparationDevice.bluetoothId = data.device.id;
      this.data.connectedPreparationDevice.bluetoothName = data.device.name;
      this.save(false);
    }
  }

  public async disconnectMachineDevice() {
    this.data.connectedPreparationDevice.bluetoothId = '';
    this.data.connectedPreparationDevice.bluetoothName = '';
    this.save(false);
  }

  public ngOnInit() {}
}
