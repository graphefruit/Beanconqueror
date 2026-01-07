import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { UIHelper } from '../../../services/uiHelper';
import { Preparation } from '../../../classes/preparation/preparation';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { PREPARATION_ACTION } from '../../../enums/preparations/preparationAction';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { PreparationDeviceType } from '../../../classes/preparationDevice';
import { PREPARATION_FUNCTION_PIPE_ENUM } from '../../../enums/preparations/preparationFunctionPipe';
import { SanremoYOUDevice } from '../../../classes/preparationDevice/sanremo/sanremoYOUDevice';
import { XeniaDevice } from '../../../classes/preparationDevice/xenia/xeniaDevice';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { powerOutline, wifiOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
} from '@ionic/angular/standalone';

@Component({
  selector: 'preparation-popover-actions',
  templateUrl: './preparation-popover-actions.component.html',
  styleUrls: ['./preparation-popover-actions.component.scss'],
  imports: [TranslatePipe, IonHeader, IonContent, IonList, IonItem, IonIcon],
})
export class PreparationPopoverActionsComponent implements OnInit {
  public static COMPONENT_ID: string = 'preparation-popover-actions';
  public data: Preparation = new Preparation();
  @Input('preparation') public preparation: IPreparation;

  public isMachineConnected: boolean = false;
  public isMachineTurnedOn: boolean = false;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiHelper: UIHelper,
  ) {
    addIcons({ powerOutline, wifiOutline });
  }

  public ionViewDidEnter(): void {}

  public async ngOnInit() {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const preparation: IPreparation = this.uiHelper.copyData(this.preparation);

    this.data.initializeByObject(preparation);

    if (
      this.data.connectedPreparationDevice?.type !== PreparationDeviceType.NONE
    ) {
      if (
        this.data.connectedPreparationDevice?.type ===
        PreparationDeviceType.SANREMO_YOU
      ) {
        const device: SanremoYOUDevice =
          this.data.getConnectedDevice() as SanremoYOUDevice;
        try {
          const deviceConnected = await device.deviceConnected();
          if (deviceConnected) {
            this.isMachineConnected = true;
            device.isMachineTurnedOn().then((isTurnedOn) => {
              this.isMachineTurnedOn = isTurnedOn;
            });
          } else {
            this.isMachineConnected = false;
          }
        } catch (ex) {
          this.isMachineConnected = false;
        }
      } else if (
        this.data.connectedPreparationDevice?.type ===
        PreparationDeviceType.XENIA
      ) {
        const device: XeniaDevice =
          this.data.getConnectedDevice() as XeniaDevice;
        try {
          const deviceConnected = await device.deviceConnected();
          if (deviceConnected) {
            this.isMachineConnected = true;
            device.isMachineTurnedOn().then((isTurnedOn) => {
              this.isMachineTurnedOn = isTurnedOn;
            });
          } else {
            this.isMachineConnected = false;
          }
        } catch (ex) {
          this.isMachineConnected = false;
        }
      }
    }
  }

  public isEspresso(): boolean {
    return this.data.getPresetStyleType() === PREPARATION_STYLE_TYPE.ESPRESSO;
  }
  public isPortafilterConnected(): boolean {
    return (
      this.data.connectedPreparationDevice.type !== PreparationDeviceType.NONE
    );
  }

  public hasPhotos(): boolean {
    return this.data.attachments.length > 0;
  }
  public getStaticActions(): any {
    return PREPARATION_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(
      undefined,
      _type,
      PreparationPopoverActionsComponent.COMPONENT_ID,
    );
  }
  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      PreparationPopoverActionsComponent.COMPONENT_ID,
    );
  }

  protected readonly PREPARATION_FUNCTION_PIPE_ENUM =
    PREPARATION_FUNCTION_PIPE_ENUM;
}
