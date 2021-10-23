import {Component, OnInit} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {UIHelper} from '../../../services/uiHelper';
import {IMill} from '../../../interfaces/mill/iMill';
import {MILL_ACTION} from '../../../enums/mills/millActions';
import {Mill} from '../../../classes/mill/mill';

@Component({
  selector: 'mill-popover-actions',
  templateUrl: './mill-popover-actions.component.html',
  styleUrls: ['./mill-popover-actions.component.scss'],
})
export class MillPopoverActionsComponent implements OnInit {

  public static COMPONENT_ID = 'mill-popover-actions';
  public data: Mill = new Mill();

  constructor(private readonly modalController: ModalController,
              private readonly navParams: NavParams,
              private readonly uiHelper: UIHelper) {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const mill: IMill = this.uiHelper.copyData(this.navParams.get('mill'));

    this.data.initializeByObject(mill);
  }

  public ionViewDidEnter(): void {
  }

  public ngOnInit() {

  }

  public hasPhotos(): boolean {
    return this.data.attachments.length > 0;
  }

  public getStaticActions(): any {
    return MILL_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(undefined, _type,MillPopoverActionsComponent.COMPONENT_ID);
  }
  public async dismiss() {
    this.modalController.dismiss(undefined, undefined,MillPopoverActionsComponent.COMPONENT_ID);
  }
}
