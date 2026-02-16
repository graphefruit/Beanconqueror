import { Component, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCheckbox,
  IonContent,
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

import { Preparation } from '../../../classes/preparation/preparation';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { MeticulousParams } from '../../../classes/preparationDevice/meticulous/meticulousDevice';
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
            if (
              this.data.connectedPreparationDevice.url.endsWith('/') === true
            ) {
              this.data.connectedPreparationDevice.url =
                this.data.connectedPreparationDevice.url.slice(0, -1);
            }
            if (
              this.data.connectedPreparationDevice.url.startsWith('http') ===
              false
            ) {
              this.data.connectedPreparationDevice.url =
                'http://' + this.data.connectedPreparationDevice.url;
            }
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
          if (this.data.connectedPreparationDevice.url.endsWith('/') === true) {
            this.data.connectedPreparationDevice.url =
              this.data.connectedPreparationDevice.url.slice(0, -1);
          }
          if (
            this.data.connectedPreparationDevice.url.startsWith('http') ===
            false
          ) {
            this.data.connectedPreparationDevice.url =
              'http://' + this.data.connectedPreparationDevice.url;
          }
        }
        if (
          this.data.connectedPreparationDevice.type ===
          PreparationDeviceType.SANREMO_YOU
        ) {
          if (this.data.connectedPreparationDevice.url.endsWith('/') === true) {
            this.data.connectedPreparationDevice.url =
              this.data.connectedPreparationDevice.url.slice(0, -1);
          }
          if (
            this.data.connectedPreparationDevice.url.startsWith('http') ===
            false
          ) {
            this.data.connectedPreparationDevice.url =
              'http://' + this.data.connectedPreparationDevice.url;
          }
        }
        if (
          this.data.connectedPreparationDevice.type ===
          PreparationDeviceType.GAGGIUINO
        ) {
          if (this.data.connectedPreparationDevice.url.endsWith('/') === true) {
            this.data.connectedPreparationDevice.url =
              this.data.connectedPreparationDevice.url.slice(0, -1);
          }
          if (
            this.data.connectedPreparationDevice.url.startsWith('http') ===
            false
          ) {
            this.data.connectedPreparationDevice.url =
              'http://' + this.data.connectedPreparationDevice.url;
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
    }, 150);
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

  public ngOnInit() {}
}
