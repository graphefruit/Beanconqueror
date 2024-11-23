import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { GreenBean } from '../../../../classes/green-bean/green-bean';
import { UIGreenBeanStorage } from '../../../../services/uiGreenBeanStorage';
import { UIImage } from '../../../../services/uiImage';
import { UIHelper } from '../../../../services/uiHelper';
import { UIFileHelper } from '../../../../services/uiFileHelper';
import { UIToast } from '../../../../services/uiToast';

import { IGreenBean } from '../../../../interfaces/green-bean/iGreenBean';
import GREEN_BEAN_TRACKING from '../../../../data/tracking/greenBeanTracking';
import { UIAnalytics } from '../../../../services/uiAnalytics';

@Component({
    selector: 'green-bean-edit',
    templateUrl: './green-bean-edit.component.html',
    styleUrls: ['./green-bean-edit.component.scss'],
    standalone: false
})
export class GreenBeanEditComponent implements OnInit {
  public static COMPONENT_ID: string = 'green-bean-edit';

  public data: GreenBean = new GreenBean();
  @Input() public greenBean: IGreenBean;

  public bean_segment = 'general';
  constructor(
    private readonly modalController: ModalController,
    private readonly uiGreenBeanStorage: UIGreenBeanStorage,
    private readonly uiImage: UIImage,
    public uiHelper: UIHelper,
    private readonly uiFileHelper: UIFileHelper,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics
  ) {}

  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.EDIT
    );
    this.data = new GreenBean();
    this.data.initializeByObject(this.greenBean);
  }

  public async editBean() {
    if (this.__formValid()) {
      await this.__editBean();
    }
  }

  private __formValid(): boolean {
    let valid: boolean = true;
    const name: string = this.data.name;
    if (name === undefined || name.trim() === '') {
      valid = false;
    }

    return valid;
  }
  private async __editBean() {
    await this.uiGreenBeanStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_GREEN_BEAN_EDITED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.EDIT_FINISH
    );
    this.dismiss();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      GreenBeanEditComponent.COMPONENT_ID
    );
  }

  public ngOnInit() {}
}
