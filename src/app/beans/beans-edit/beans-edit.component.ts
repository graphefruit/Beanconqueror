import { Component, Input, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { UIBeanStorage } from '../../../services/uiBeanStorage';

import { UIHelper } from '../../../services/uiHelper';
import { UIImage } from '../../../services/uiImage';
import { IBean } from '../../../interfaces/bean/iBean';
import { Bean } from '../../../classes/bean/bean';
import { UIToast } from '../../../services/uiToast';
import { UIAnalytics } from '../../../services/uiAnalytics';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIAlert } from '../../../services/uiAlert';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'beans-edit',
  templateUrl: './beans-edit.component.html',
  styleUrls: ['./beans-edit.component.scss'],
})
export class BeansEditComponent implements OnInit {
  public static COMPONENT_ID: string = 'bean-edit';
  public settings: Settings = undefined;
  public data: Bean;
  @Input() public bean: IBean;
  public bean_segment = 'general';
  private initial_bean_data_stringified: String = '';

  constructor(
    private readonly navParams: NavParams,
    private readonly modalController: ModalController,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiImage: UIImage,
    private readonly uiHelper: UIHelper,
    private readonly uiAlert: UIAlert,
    private readonly uiToast: UIToast,
    private readonly uiAnalytics: UIAnalytics,
    public readonly uiBeanHelper: UIBeanHelper,
    private readonly uiSettingsStorage: UISettingsStorage
  ) {}

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.EDIT
    );
    this.data = new Bean();
    this.data.initializeByObject(this.bean);
    this.initial_bean_data_stringified = JSON.stringify(this.data);
  }

  public async editBean() {
    if (this.__formValid()) {
      await this.__editBean();
    }
  }

  public confirmDismiss(): void {
    if (JSON.stringify(this.data) !== this.initial_bean_data_stringified) {
      this.uiAlert
        .showConfirm('PAGE_BEANS_DISCARD_CONFIRM', 'SURE_QUESTION', true)
        .then(
          async () => {
            this.dismiss();
          },
          () => {
            // No
          }
        );
    } else {
      this.dismiss();
    }
  }

  private dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BeansEditComponent.COMPONENT_ID
    );
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
    await this.uiBeanStorage.update(this.data);
    this.uiToast.showInfoToast('TOAST_BEAN_EDITED_SUCCESSFULLY');
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.EDIT_FINISH
    );
    this.dismiss();
  }

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
  }
}
