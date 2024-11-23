import {Component, Input, OnInit} from '@angular/core';
import {UIMillStorage} from '../../../services/uiMillStorage';
import {Mill} from '../../../classes/mill/mill';
import {ModalController} from '@ionic/angular';
import {UIToast} from '../../../services/uiToast';
import MILL_TRACKING from '../../../data/tracking/millTracking';
import {UIAnalytics} from '../../../services/uiAnalytics';

@Component({
    selector: 'mill-add',
    templateUrl: './mill-add.component.html',
    styleUrls: ['./mill-add.component.scss'],
    standalone: false
})
export class MillAddComponent implements OnInit {

  public static COMPONENT_ID: string = 'mill-add';

  public data: Mill = new Mill();
  @Input() private hide_toast_message: boolean;
  constructor(private readonly modalController: ModalController,
              private readonly uiMillStorage: UIMillStorage,
              private readonly uiToast: UIToast,
              private readonly uiAnalytics: UIAnalytics) {

  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(MILL_TRACKING.TITLE, MILL_TRACKING.ACTIONS.ADD);
  }
  public async addMill() {

    if (this.data.name) {
      await this.__addMill();
    }
  }

  public async __addMill() {
    await this.uiMillStorage.add(this.data);
    this.uiAnalytics.trackEvent(MILL_TRACKING.TITLE, MILL_TRACKING.ACTIONS.ADD_FINISH);
    this.dismiss();
    if (!this.hide_toast_message) {
      this.uiToast.showInfoToast('TOAST_MILL_ADDED_SUCCESSFULLY');
    }
  }

  public dismiss(): void {
    this.modalController.dismiss({
      'dismissed': true
    },undefined, MillAddComponent.COMPONENT_ID)

  }
  public ngOnInit() {}

}
