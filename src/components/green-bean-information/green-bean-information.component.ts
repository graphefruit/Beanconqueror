import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';

import { ModalController } from '@ionic/angular';
import { UIBeanHelper } from '../../services/uiBeanHelper';

import { GreenBean } from '../../classes/green-bean/green-bean';
import { GreenBeanPopoverActionsComponent } from '../../app/roasting-section/green-beans/green-bean-popover-actions/green-bean-popover-actions.component';
import { Bean } from '../../classes/bean/bean';
import { GreenBeanAddComponent } from '../../app/roasting-section/green-beans/green-bean-add/green-bean-add.component';
import { BeansAddComponent } from '../../app/beans/beans-add/beans-add.component';
import { Brew } from '../../classes/brew/brew';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIGreenBeanStorage } from '../../services/uiGreenBeanStorage';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIToast } from '../../services/uiToast';
import { UIImage } from '../../services/uiImage';
import { UIAlert } from '../../services/uiAlert';
import { Settings } from '../../classes/settings/settings';
import { GREEN_BEAN_ACTION } from '../../enums/green-beans/greenBeanAction';
import { UIBeanStorage } from '../../services/uiBeanStorage';
import GREEN_BEAN_TRACKING from '../../data/tracking/greenBeanTracking';
import { NgxStarsComponent } from 'ngx-stars';
import { UIGreenBeanHelper } from '../../services/uiGreenBeanHelper';

@Component({
  selector: 'green-bean-information',
  templateUrl: './green-bean-information.component.html',
  styleUrls: ['./green-bean-information.component.scss'],
})
export class GreenBeanInformationComponent implements OnInit {
  @Input() public greenBean: GreenBean;

  @Output() public greenBeanAction: EventEmitter<any> = new EventEmitter();
  @ViewChild('greenBeanRating', { read: NgxStarsComponent, static: false })
  public greenBeanRating: NgxStarsComponent;

  public settings: Settings;
  constructor(
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiGreenBeanStorage: UIGreenBeanStorage,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly modalController: ModalController,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiAlert: UIAlert,
    private readonly uiToast: UIToast,
    private readonly uiImage: UIImage,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiGreenBeanHelper: UIGreenBeanHelper
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
  }
  public ngOnInit() {}
  public ngAfterViewInit() {
    this.resetRenderingRating();
  }
  public ngOnChanges() {
    this.resetRenderingRating();
  }

  private resetRenderingRating() {
    setTimeout(() => {
      // Timeout needed because of ngif not rendering

      if (this.greenBeanRating && this.greenBean.rating !== 0) {
        this.greenBeanRating.setRating(this.greenBean.rating);
      }
    }, 250);
  }

  public daysOld(): number {
    return this.greenBean.beanAgeInDays();
  }

  public async showGreenBean() {
    await this.detailBean();
  }

  public async showBeanActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.POPOVER_ACTIONS
    );
    const popover = await this.modalController.create({
      component: GreenBeanPopoverActionsComponent,
      componentProps: { 'green-bean': this.greenBean },
      id: GreenBeanPopoverActionsComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.75, 1],
      initialBreakpoint: 1,
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      await this.internalBeanAction(data.role as GREEN_BEAN_ACTION);
      this.greenBeanAction.emit([
        data.role as GREEN_BEAN_ACTION,
        this.greenBean,
      ]);
    }
  }

  private async internalBeanAction(action: GREEN_BEAN_ACTION) {
    switch (action) {
      case GREEN_BEAN_ACTION.DETAIL:
        await this.detailBean();
        break;
      case GREEN_BEAN_ACTION.REPEAT:
        await this.repeatBean();
        break;
      case GREEN_BEAN_ACTION.EDIT:
        await this.editBean();
        break;
      case GREEN_BEAN_ACTION.DELETE:
        try {
          await this.deleteBean();
        } catch (ex) {}
        await this.uiAlert.hideLoadingSpinner();
        break;
      case GREEN_BEAN_ACTION.BEANS_CONSUMED:
        await this.beansConsumed();
        break;
      case GREEN_BEAN_ACTION.PHOTO_GALLERY:
        await this.viewPhotos();
        break;
      case GREEN_BEAN_ACTION.TRANSFER_ROAST:
        await this.transferRoast();
        break;
      default:
        break;
    }
  }
  public getUsedWeightCount(): number {
    let usedWeightCount: number = 0;
    const relatedRoastingBeans: Array<Bean> =
      this.uiBeanHelper.getAllRoastedBeansForThisGreenBean(
        this.greenBean.config.uuid
      );
    for (const roast of relatedRoastingBeans) {
      usedWeightCount += roast.bean_roast_information.green_bean_weight;
    }
    return usedWeightCount;
  }

  public roastCount(): number {
    const relatedRoastingBeans: Array<Bean> =
      this.uiBeanHelper.getAllRoastedBeansForThisGreenBean(
        this.greenBean.config.uuid
      );
    return relatedRoastingBeans.length;
  }
  public async detailBean() {
    await this.uiGreenBeanHelper.detailGreenBean(this.greenBean);
  }
  public async showPhoto(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.viewPhotos();
  }

  public async viewPhotos() {
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.PHOTO_VIEW
    );
    await this.uiImage.viewPhotos(this.greenBean);
  }

  public async transferRoast() {
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.TRANSFER_ROAST
    );
    await this.uiBeanHelper.addRoastedBean(this.greenBean);
  }
  public async beansConsumed() {
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.ARCHIVE
    );
    this.greenBean.finished = true;
    await this.uiGreenBeanStorage.update(this.greenBean);
    this.uiToast.showInfoToast('TOAST_GREEN_BEAN_ARCHIVED_SUCCESSFULLY');
    await this.resetSettings();
  }

  private async resetSettings() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.resetFilter();
    await this.uiSettingsStorage.saveSettings(settings);
  }

  public async longPressEditBean(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.editBean();
    this.greenBeanAction.emit([GREEN_BEAN_ACTION.EDIT, this.greenBean]);
  }

  public async editBean() {
    await this.uiGreenBeanHelper.editGreenBean(this.greenBean);
  }

  public async deleteBean(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      this.uiAlert
        .showConfirm('DELETE_GREEN_BEAN_QUESTION', 'SURE_QUESTION', true)
        .then(
          async () => {
            await this.uiAlert.showLoadingSpinner();
            // Yes
            this.uiAnalytics.trackEvent(
              GREEN_BEAN_TRACKING.TITLE,
              GREEN_BEAN_TRACKING.ACTIONS.DELETE
            );
            await this.__deleteBean();
            this.uiToast.showInfoToast('TOAST_GREEN_BEAN_DELETED_SUCCESSFULLY');
            await this.resetSettings();
            resolve(undefined);
          },
          () => {
            // No
            reject();
          }
        );
    });
  }

  public async repeatBean() {
    this.uiAnalytics.trackEvent(
      GREEN_BEAN_TRACKING.TITLE,
      GREEN_BEAN_TRACKING.ACTIONS.REPEAT
    );

    await this.uiGreenBeanHelper.repeatGreenBean(this.greenBean);
  }
  private async __deleteBean() {
    const brews: Array<Brew> = this.uiBrewStorage.getAllEntries();
    const relatedRoastingBeans: Array<Bean> =
      this.uiBeanHelper.getAllRoastedBeansForThisGreenBean(
        this.greenBean.config.uuid
      );
    let deletingBrews: Array<Brew> = [];
    for (const roastedBean of relatedRoastingBeans) {
      const filteredBrews: Array<Brew> = brews.filter(
        (e) => e.bean === roastedBean.config.uuid
      );
      deletingBrews = [...deletingBrews, ...filteredBrews];
    }

    for (const brew of deletingBrews) {
      await this.uiBrewStorage.removeByUUID(brew.config.uuid);
    }
    for (const bean of relatedRoastingBeans) {
      await this.uiBeanStorage.removeByUUID(bean.config.uuid);
    }
    await this.uiGreenBeanStorage.removeByObject(this.greenBean);
  }

  public hasPhotos(): boolean {
    return this.greenBean.attachments.length > 0;
  }
}
