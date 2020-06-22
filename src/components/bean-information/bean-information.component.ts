import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
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

@Component({
  selector: 'bean-information',
  templateUrl: './bean-information.component.html',
  styleUrls: ['./bean-information.component.scss'],
})
export class BeanInformationComponent implements OnInit {

  @Input() public bean: Bean;


  @Output() public beanAction: EventEmitter<any> = new EventEmitter();
  public slideOpts = {
    pager: true,

  };

  public roast_enum = ROASTS_ENUM;
  public settings: Settings;

  constructor(private readonly uiSettingsStorage: UISettingsStorage,
              private readonly popoverCtrl: PopoverController,
              private readonly uiBeanHelper: UIBeanHelper,
              private readonly modalController: ModalController) {
    this.settings = this.uiSettingsStorage.getSettings();


  }


  public ngOnInit() {
    debugger;
    //  this.bean.attachments.push('https://blog.decaf.de/content/images/2015/06/five-roasters-coffee.jpg');
// this.bean.attachments.push('https://www.roesttrommel.de/media/image/51/e5/2b/RT_Packshot_Nicaragua_Mierisch_H_600x600@2x.jpg');
    // this.bean.attachments.push('https://www.machhoerndl-kaffee.de/media/image/d0/5d/0b/Ecuador_Ilda_Mayo_Filter_600x600.jpg');
  }

  public brewCounts(): number {

    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(this.bean.config.uuid);
    return relatedBrews.length;
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
      componentProps: {bean: this.bean}
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    this.beanAction.emit([data.role as BEAN_ACTION, this.bean]);
  }

  public async viewPhotos() {
    const modal = await this.modalController.create({component: BeanPhotoViewComponent, componentProps: {bean: this.bean}});
    await modal.present();
    await modal.onWillDismiss();
  }


  public getCustomIcon() {
    return '';
  }

  public openPhotoGallery() {

  }

}
