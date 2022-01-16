import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {Bean} from '../../classes/bean/bean';
import {Settings} from '../../classes/settings/settings';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {ModalController} from '@ionic/angular';
import {BeanPopoverActionsComponent} from '../../app/beans/bean-popover-actions/bean-popover-actions.component';
import {BEAN_ACTION} from '../../enums/beans/beanAction';
import {Brew} from '../../classes/brew/brew';
import {UIBeanHelper} from '../../services/uiBeanHelper';
import {ROASTS_ENUM} from '../../enums/beans/roasts';
import {NgxStarsComponent} from 'ngx-stars';
import {BeansDetailComponent} from '../../app/beans/beans-detail/beans-detail.component';
import {BeansAddComponent} from '../../app/beans/beans-add/beans-add.component';
import {BeansEditComponent} from '../../app/beans/beans-edit/beans-edit.component';
import {UIAnalytics} from '../../services/uiAnalytics';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {UIAlert} from '../../services/uiAlert';
import {UIToast} from '../../services/uiToast';
import {UIImage} from '../../services/uiImage';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import BEAN_TRACKING from '../../data/tracking/beanTracking';
import {ShareService} from '../../services/shareService/share-service.service';
@Component({
  selector: 'bean-information',
  templateUrl: './bean-information.component.html',
  styleUrls: ['./bean-information.component.scss'],
})
export class BeanInformationComponent implements OnInit {

  @Input() public bean: Bean;
  @Input() public showActions: boolean = true;

  @ViewChild('beanStars', {read: NgxStarsComponent, static: false}) public beanStars: NgxStarsComponent;
  @ViewChild('beanRating', {read: NgxStarsComponent, static: false}) public beanRating: NgxStarsComponent;

  @Output() public beanAction: EventEmitter<any> = new EventEmitter();


  public roast_enum = ROASTS_ENUM;

  constructor(private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiBeanHelper: UIBeanHelper,
              private readonly modalController: ModalController,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiAlert: UIAlert,
              private readonly uiToast: UIToast,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiImage: UIImage,
              private readonly shareService: ShareService) {

  }


  public ngOnInit() {
  }
  public ngAfterViewInit() {
    this.resetRenderingRating();
  }
  public ngOnChanges() {
    this.resetRenderingRating();
  }

  private resetRenderingRating() {
    setTimeout(() => {
      // Timeout needed because of ngif not rendering
      if (this.beanStars && this.bean.roast_range !== 0) {
        this.beanStars.setRating(this.bean.roast_range);
      }
      if (this.beanRating && this.bean.rating !== 0) {
        this.beanRating.setRating(this.bean.rating);
      }
    },250);

  }

  public brewCounts(): number {

    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(this.bean.config.uuid);
    return relatedBrews.length;
  }

  public daysOld(): number {

    return this.bean.beanAgeInDays();

  }

  public getUsedWeightCount(): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(this.bean.config.uuid);
    for (const brew of relatedBrews) {
      if (brew.bean_weight_in > 0) {
        usedWeightCount += brew.bean_weight_in;
      } else {
        usedWeightCount += brew.grind_weight;
      }
    }
    return usedWeightCount;
  }

  public getRoastEnum(_key: ROASTS_ENUM) {
    for (const key in ROASTS_ENUM) {
      if (ROASTS_ENUM[key] === _key) {
        return (key as ROASTS_ENUM);
      }
    }
    return '';
  }

  public async showBean() {
    await this.detailBean();
  }

  public async showPhoto(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.viewPhotos();
  }

  public async showBeanActions(event): Promise<void> {
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.uiAnalytics.trackEvent(BEAN_TRACKING.TITLE, BEAN_TRACKING.ACTIONS.POPOVER_ACTIONS);
    const popover = await this.modalController.create({
      component: BeanPopoverActionsComponent,
      componentProps: {bean: this.bean},
      id:BeanPopoverActionsComponent.COMPONENT_ID,
      cssClass: 'popover-actions',
      breakpoints: [0, 0.2, 0.5, 0.75, 1],
      initialBreakpoint: 0.5,
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    if (data.role !== undefined) {
      await this.internalBeanAction(data.role as BEAN_ACTION);
      this.beanAction.emit([data.role as BEAN_ACTION, this.bean]);
    }
  }


  public async internalBeanAction(action: BEAN_ACTION): Promise<void> {
    switch (action) {
      case BEAN_ACTION.DETAIL:
        await this.detailBean();
        break;
      case BEAN_ACTION.REPEAT:
        await this.repeatBean();
        break;
      case BEAN_ACTION.EDIT:
        await this.editBean();
        break;
      case BEAN_ACTION.DELETE:
        try {
          await this.deleteBean();
        }catch (ex) {}
        await this.uiAlert.hideLoadingSpinner();
        break;
      case BEAN_ACTION.BEANS_CONSUMED:
        await this.beansConsumed();
        break;
      case BEAN_ACTION.PHOTO_GALLERY:
        await this.viewPhotos();
        break;
      case BEAN_ACTION.SHARE:
        await this.shareBean();
        break;
      default:
        break;
    }
  }

  public async detailBean() {
    await this.uiBeanHelper.detailBean(this.bean);
  }

  private async viewPhotos() {
    this.uiAnalytics.trackEvent(BEAN_TRACKING.TITLE, BEAN_TRACKING.ACTIONS.PHOTO_VIEW);
    await this.uiImage.viewPhotos(this.bean);
  }
  public async beansConsumed() {
    this.uiAnalytics.trackEvent(BEAN_TRACKING.TITLE, BEAN_TRACKING.ACTIONS.ARCHIVE);
    this.bean.finished = true;
    await this.uiBeanStorage.update(this.bean);
    this.uiToast.showInfoToast('TOAST_BEAN_ARCHIVED_SUCCESSFULLY');
    await this.resetSettings();
  }

  public async add() {
    await this.uiBeanHelper.addBean();
  }

  public async longPressEditBean(event) {
    event.stopPropagation();
    event.stopImmediatePropagation();
    await this.editBean();
    this.beanAction.emit([BEAN_ACTION.EDIT, this.bean]);
  }
  public async editBean() {
    await this.uiBeanHelper.editBean(this.bean);
  }

  public async shareBean() {
    await this.shareService.shareBean(this.bean);
  }


  public async deleteBean(): Promise<any> {
    return new Promise(async (resolve,reject) => {
      this.uiAlert.showConfirm('DELETE_BEAN_QUESTION', 'SURE_QUESTION', true)
        .then(async () => {
            await this.uiAlert.showLoadingSpinner();
            // Yes
            this.uiAnalytics.trackEvent(BEAN_TRACKING.TITLE, BEAN_TRACKING.ACTIONS.DELETE);
            await this.__deleteBean();
            this.uiToast.showInfoToast('TOAST_BEAN_DELETED_SUCCESSFULLY');
            await this.resetSettings();
            resolve(undefined);
          },
          () => {
            // No
            reject();
          });
    });

  }


  private async resetSettings() {
    const settings: Settings = this.uiSettingsStorage.getSettings();
    settings.resetFilter();
    await this.uiSettingsStorage.saveSettings(settings);
  }

  public async repeatBean() {
    this.uiAnalytics.trackEvent(BEAN_TRACKING.TITLE, BEAN_TRACKING.ACTIONS.REPEAT);
    await this.uiBeanHelper.repeatBean(this.bean);

  }


  private async __deleteBean() {
    const brews: Array<Brew> =  this.uiBrewStorage.getAllEntries();

    const deletingBrewIndex: Array<number> = [];
    for (let i = 0; i < brews.length; i++) {
      if (brews[i].bean === this.bean.config.uuid) {
        deletingBrewIndex.push(i);
      }
    }
    for (let i = deletingBrewIndex.length; i--;) {
      await this.uiBrewStorage.removeByUUID(brews[deletingBrewIndex[i]].config.uuid);
    }

    await this.uiBeanStorage.removeByObject(this.bean);

  }




}
