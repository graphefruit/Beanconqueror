import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIHelper } from '../../../services/uiHelper';
import { IBean } from '../../../interfaces/bean/iBean';
import { Bean } from '../../../classes/bean/bean';
import { BEAN_ACTION } from '../../../enums/beans/beanAction';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { Brew } from '../../../classes/brew/brew';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';

@Component({
    selector: 'bean-popover-actions',
    templateUrl: './bean-popover-actions.component.html',
    styleUrls: ['./bean-popover-actions.component.scss'],
    standalone: false
})
export class BeanPopoverActionsComponent implements OnInit {
  public static COMPONENT_ID = 'bean-popover-actions';
  public data: Bean = new Bean();

  @Input('bean') public bean: IBean;

  public settings: Settings;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiHelper: UIHelper,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiSettingsStorage: UISettingsStorage
  ) {
    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
  }

  public ionViewDidEnter(): void {}

  public ngOnInit() {
    const bean: IBean = this.uiHelper.copyData(this.bean);
    this.data.initializeByObject(bean);
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public hasPhotos(): boolean {
    return this.data.attachments.length > 0;
  }

  public hasBrews(): boolean {
    try {
      let allBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
        this.data.config.uuid
      );
      allBrews = allBrews.filter(
        (e) =>
          e.getBean().finished === false &&
          e.getMill().finished === false &&
          e.getPreparation().finished === false
      );
      return allBrews.length > 0;
    } catch {
      return false;
    }
  }

  public getStaticActions(): any {
    return BEAN_ACTION;
  }

  public async choose(_type: string): Promise<void> {
    this.modalController.dismiss(
      undefined,
      _type,
      BeanPopoverActionsComponent.COMPONENT_ID
    );
  }
  public async dismiss() {
    this.modalController.dismiss(
      undefined,
      undefined,
      BeanPopoverActionsComponent.COMPONENT_ID
    );
  }
}
