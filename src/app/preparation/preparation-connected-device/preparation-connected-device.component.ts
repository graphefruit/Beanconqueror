import { Component, Input } from '@angular/core';
import { Preparation } from '../../../classes/preparation/preparation';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { ModalController } from '@ionic/angular';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { PreparationDevice } from '../../../classes/preparationDevice/preparationDevice';
import { UIToast } from '../../../services/uiToast';
import { UIAlert } from '../../../services/uiAlert';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { environment } from '../../../environments/environment';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { SanremoYOUParams } from '../../../classes/preparationDevice/sanremo/sanremoYOUDevice';
import { MeticulousParams } from '../../../classes/preparationDevice/meticulous/meticulousDevice';
import { XeniaParams } from '../../../classes/preparationDevice/xenia/xeniaDevice';

@Component({
  selector: 'app-preparation-connected-device',
  templateUrl: './preparation-connected-device.component.html',
  styleUrls: ['./preparation-connected-device.component.scss'],
})
export class PreparationConnectedDeviceComponent {
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
  constructor(
    private readonly modalController: ModalController,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly uiToast: UIToast,
    private readonly uiAlert: UIAlert,
    public readonly uiHelper: UIHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
  ) {}

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
