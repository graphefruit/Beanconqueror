import { Component, Input, OnInit } from '@angular/core';
import { Preparation } from '../../../classes/preparation/preparation';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { ModalController, NavParams } from '@ionic/angular';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { ServerBrew } from '../../../classes/server/brew/brew';
import { environment } from '../../../environments/environment';
import { catchError, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { PreparationDevice } from '../../../classes/preparationDevice/preparationDevice';
import { UIToast } from '../../../services/uiToast';
import { UIAlert } from '../../../services/uiAlert';
import { XeniaDevice } from '../../../classes/preparationDevice/xenia/xeniaDevice';

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
  @Input() private preparation: IPreparation;

  constructor(
    private readonly navParams: NavParams,
    private readonly modalController: ModalController,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly uiToast: UIToast,
    private readonly uiAlert: UIAlert
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

  public async save() {
    await this.uiPreparationStorage.update(this.data);
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

  public getScripts() {
    const connectedDevice: XeniaDevice =
      this.uiPreparationHelper.getConnectedDevice(this.data);
    if (connectedDevice) {
      connectedDevice.getScripts();
    }
  }
  public startScripts() {
    const connectedDevice: XeniaDevice =
      this.uiPreparationHelper.getConnectedDevice(this.data);
    if (connectedDevice) {
      connectedDevice.startScript(11);
    }
  }
  public stopScript() {
    const connectedDevice: XeniaDevice =
      this.uiPreparationHelper.getConnectedDevice(this.data);
    if (connectedDevice) {
      connectedDevice.stopScript();
    }
  }
}
