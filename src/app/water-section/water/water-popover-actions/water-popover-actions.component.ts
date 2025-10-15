import { Component, Input, OnInit } from '@angular/core';
import { Water } from '../../../../classes/water/water';
import { WATER_ACTION } from '../../../../enums/water/waterActions';
import { ModalController } from '@ionic/angular';
import { IWater } from '../../../../interfaces/water/iWater';

@Component({
  selector: 'app-water-popover-actions',
  templateUrl: './water-popover-actions.component.html',
  styleUrls: ['./water-popover-actions.component.scss'],
  standalone: false,
})
export class WaterPopoverActionsComponent implements OnInit {
  public static COMPONENT_ID = 'water-popover-actions';

  public data: Water = new Water();
  @Input('water') public water: IWater;
  constructor(private readonly modalController: ModalController) {
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
