import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { UIHelper } from '../../../services/uiHelper';
import { IMill } from '../../../interfaces/mill/iMill';
import { MILL_ACTION } from '../../../enums/mills/millActions';
import { Mill } from '../../../classes/mill/mill';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
} from '@ionic/angular/standalone';

@Component({
  selector: 'mill-popover-actions',
  templateUrl: './mill-popover-actions.component.html',
  styleUrls: ['./mill-popover-actions.component.scss'],
  imports: [TranslatePipe, IonHeader, IonContent, IonList, IonItem, IonIcon],
})
export class MillPopoverActionsComponent implements OnInit {
  public static COMPONENT_ID = 'mill-popover-actions';
  public data: Mill = new Mill();
  @Input('mill') public mill: IMill;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiHelper: UIHelper,
  ) {}

  public ionViewDidEnter(): void {}

  public ngOnInit() {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const mill: IMill = this.uiHelper.copyData(this.mill);

    this.data.initializeByObject(mill);
  }

  public hasPhotos(): boolean {
    return this.data.attachments.length > 0;
  }

  public getStaticActions(): any {
    return MILL_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(
      undefined,
      _type,
      MillPopoverActionsComponent.COMPONENT_ID,
    );
  }
  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      MillPopoverActionsComponent.COMPONENT_ID,
    );
  }
}
