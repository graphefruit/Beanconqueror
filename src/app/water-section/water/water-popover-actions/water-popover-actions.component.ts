import { Component, Input, OnInit, inject } from '@angular/core';
import { Water } from '../../../../classes/water/water';
import { WATER_ACTION } from '../../../../enums/water/waterActions';
import { ModalController } from '@ionic/angular/standalone';
import { IWater } from '../../../../interfaces/water/iWater';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonContent,
  IonList,
  IonItem,
  IonIcon,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-water-popover-actions',
  templateUrl: './water-popover-actions.component.html',
  styleUrls: ['./water-popover-actions.component.scss'],
  imports: [TranslatePipe, IonHeader, IonContent, IonList, IonItem, IonIcon],
})
export class WaterPopoverActionsComponent implements OnInit {
  private readonly modalController = inject(ModalController);

  public static COMPONENT_ID = 'water-popover-actions';

  public data: Water = new Water();
  @Input('water') public water: IWater;
  constructor() {
    this.data.initializeByObject(this.water);
  }

  public ionViewDidEnter(): void {}

  public ngOnInit() {}

  public hasPhotos(): boolean {
    return this.data.attachments.length > 0;
  }

  public getStaticActions(): any {
    return WATER_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(
      undefined,
      _type,
      WaterPopoverActionsComponent.COMPONENT_ID,
    );
  }
  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      WaterPopoverActionsComponent.COMPONENT_ID,
    );
  }
}
