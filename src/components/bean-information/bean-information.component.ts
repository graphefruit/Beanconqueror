import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Bean} from '../../classes/bean/bean';
import {Settings} from '../../classes/settings/settings';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {PopoverController} from '@ionic/angular';
import {BeanPopoverActionsComponent} from '../../app/beans/bean-popover-actions/bean-popover-actions.component';
import {BEAN_ACTION} from '../../enums/beans/beanAction';
import {Brew} from '../../classes/brew/brew';
import {UIBeanHelper} from '../../services/uiBeanHelper';

@Component({
  selector: 'bean-information',
  templateUrl: './bean-information.component.html',
  styleUrls: ['./bean-information.component.scss'],
})
export class BeanInformationComponent implements OnInit {

  @Input() public bean: Bean;


  @Output() public beanAction: EventEmitter<any> = new EventEmitter();

  public settings: Settings;

  constructor(private readonly uiSettingsStorage: UISettingsStorage,
              private readonly popoverCtrl: PopoverController,
              private readonly uiBeanHelper: UIBeanHelper) {
    this.settings = this.uiSettingsStorage.getSettings();


  }

  public ngOnInit() {


  }

  public brewCounts(): number {

    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(this.bean.config.uuid);
    return relatedBrews.length;
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


}
