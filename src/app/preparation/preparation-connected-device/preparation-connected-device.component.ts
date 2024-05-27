import { Component, Input, OnInit } from '@angular/core';
import { Preparation } from '../../../classes/preparation/preparation';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { ModalController, NavParams } from '@ionic/angular';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { PreparationDevice } from '../../../classes/preparationDevice/preparationDevice';
import { UIToast } from '../../../services/uiToast';
import { UIAlert } from '../../../services/uiAlert';
import { XeniaDevice } from '../../../classes/preparationDevice/xenia/xeniaDevice';
import { UIHelper } from '../../../services/uiHelper';

@Component({
  selector: 'app-preparation-connected-device',
  templateUrl: './preparation-connected-device.component.html',
  styleUrls: ['./preparation-connected-device.component.scss'],
})
export class PreparationConnectedDeviceComponent implements OnInit {
  public static COMPONENT_ID: string = 'preparation-connected-device';
  public data: Preparation = new Preparation();
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;
  public preparationTypeEnum = PREPARATION_TYPES;
  public segment: string = 'manage';
  public PREPARATION_DEVICE_TYPE = PreparationDeviceType;
  @Input() public preparation: IPreparation;

  public pinFormatter(value: any) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return `${0}`;
    }
    const newValue = +parsedFloat.toFixed(2);
    return `${newValue}`;
  }
  constructor(
    private readonly navParams: NavParams,
    private readonly modalController: ModalController,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly uiToast: UIToast,
    private readonly uiAlert: UIAlert,
    private readonly uiHelper: UIHelper
  ) {}

  public ionViewWillEnter(): void {
    if (this.preparation !== undefined) {
      this.data.initializeByObject(this.preparation);
    }
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      PreparationConnectedDeviceComponent.COMPONENT_ID
    );
  }

  public async setUrl() {}
  public async save() {
    setTimeout(async () => {
      if (
        this.data.connectedPreparationDevice.type ===
        PreparationDeviceType.XENIA
      ) {
        if (this.data.connectedPreparationDevice.url === '') {
          this.data.connectedPreparationDevice.url = 'http://xenia.local';
        } else {
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
          this.data.connectedPreparationDevice.customParams.apiVersion ===
          undefined
        ) {
          this.data.connectedPreparationDevice.customParams.apiVersion = 'V2';
        }
        if (
          this.data.connectedPreparationDevice.customParams.residualLagTime ===
          undefined
        ) {
          this.data.connectedPreparationDevice.customParams.residualLagTime = 1.35;
        }
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
            'PREPARATION_DEVICE.CONNECTION.SUCCESFULLY'
          );
        },
        () => {
          this.uiAlert.showMessage(
            'PREPARATION_DEVICE.CONNECTION.UNSUCCESFULLY',
            undefined,
            undefined,
            true
          );
        }
      );
    }
  }
  public ngOnInit() {}
}
