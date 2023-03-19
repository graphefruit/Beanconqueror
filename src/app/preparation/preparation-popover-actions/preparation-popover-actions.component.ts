import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { UIHelper } from '../../../services/uiHelper';
import { Preparation } from '../../../classes/preparation/preparation';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { PREPARATION_ACTION } from '../../../enums/preparations/preparationAction';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { PreparationDeviceType } from '../../../classes/preparationDevice';

@Component({
  selector: 'preparation-popover-actions',
  templateUrl: './preparation-popover-actions.component.html',
  styleUrls: ['./preparation-popover-actions.component.scss'],
})
export class PreparationPopoverActionsComponent implements OnInit {
  public static COMPONENT_ID: string = 'preparation-popover-actions';
  public data: Preparation = new Preparation();

  constructor(
    private readonly modalController: ModalController,
    private readonly navParams: NavParams,
    private readonly uiHelper: UIHelper
  ) {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const preparation: IPreparation = this.uiHelper.copyData(
      this.navParams.get('preparation')
    );

    this.data.initializeByObject(preparation);
  }

  public ionViewDidEnter(): void {}

  public ngOnInit() {}

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
      PreparationPopoverActionsComponent.COMPONENT_ID
    );
  }
  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      PreparationPopoverActionsComponent.COMPONENT_ID
    );
  }
}
