import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {Bean} from '../../classes/bean/bean';
import {Settings} from '../../classes/settings/settings';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {ModalController, PopoverController} from '@ionic/angular';
import {BeanPopoverActionsComponent} from '../../app/beans/bean-popover-actions/bean-popover-actions.component';
import {BEAN_ACTION} from '../../enums/beans/beanAction';
import {Brew} from '../../classes/brew/brew';
import {UIBeanHelper} from '../../services/uiBeanHelper';
import {ROASTS_ENUM} from '../../enums/beans/roasts';
import {BeanPhotoViewComponent} from '../../app/beans/bean-photo-view/bean-photo-view.component';
import {NgxStarsComponent} from 'ngx-stars';

@Component({
  selector: 'bean-information',
  templateUrl: './bean-information.component.html',
  styleUrls: ['./bean-information.component.scss'],
})
export class BeanInformationComponent implements OnInit {

  @Input() public bean: Bean;

  @ViewChild('beanStars', {read: NgxStarsComponent, static: false}) public beanStars: NgxStarsComponent;
  @Output() public beanAction: EventEmitter<any> = new EventEmitter();


  public roast_enum = ROASTS_ENUM;
  public settings: Settings;



  constructor(private readonly uiSettingsStorage: UISettingsStorage,
              private readonly popoverCtrl: PopoverController,
              private readonly uiBeanHelper: UIBeanHelper,
              private readonly modalController: ModalController) {
    this.settings = this.uiSettingsStorage.getSettings();


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
    if (this.beanStars && this.bean.roast_range !== 0) {
      this.beanStars.setRating(this.bean.roast_range);
    }
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
      usedWeightCount += brew.grind_weight;
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

  public async showBeanActions(event): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: BeanPopoverActionsComponent,
      event,
      translucent: true,
      componentProps: {bean: this.bean},
      id:'bean-popover-actions'
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    this.beanAction.emit([data.role as BEAN_ACTION, this.bean]);
  }

  public async viewPhotos() {
    const modal = await this.modalController.create({component: BeanPhotoViewComponent,id:'bean-photo', componentProps: {bean: this.bean}});
    await modal.present();
    await modal.onWillDismiss();
  }




}
