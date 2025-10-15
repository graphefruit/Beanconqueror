import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIHelper } from '../../../services/uiHelper';
import { Mill } from '../../../classes/mill/mill';
import { IMill } from '../../../interfaces/mill/iMill';
import MILL_TRACKING from '../../../data/tracking/millTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';

@Component({
  selector: 'app-mill-detail',
  templateUrl: './mill-detail.component.html',
  styleUrls: ['./mill-detail.component.scss'],
  standalone: false,
})
export class MillDetailComponent implements OnInit {
  public static COMPONENT_ID: string = 'mill-detail';
  @Input('mill') public mill: IMill;
  public data: Mill = new Mill();

  constructor(
    private readonly modalController: ModalController,
    public uiHelper: UIHelper,
    private readonly uiAnalytics: UIAnalytics,
  ) {}

  public ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      MILL_TRACKING.TITLE,
      MILL_TRACKING.ACTIONS.DETAIL,
    );

    if (this.mill) {
      const copy: IMill = this.uiHelper.copyData(this.mill);
      this.data.initializeByObject(copy);
    }
  }

  public ngOnInit() {}
  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      MillDetailComponent.COMPONENT_ID,
    );
  }
}
