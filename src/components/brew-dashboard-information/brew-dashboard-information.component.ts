import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Brew} from '../../classes/brew/brew';
import {Bean} from '../../classes/bean/bean';
import {Preparation} from '../../classes/preparation/preparation';
import {Mill} from '../../classes/mill/mill';
import {Settings} from '../../classes/settings/settings';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {PopoverController} from '@ionic/angular';
import {BrewPopoverActionsComponent} from '../../app/brew/brew-popover-actions/brew-popover-actions.component';
import {BREW_ACTION} from '../../enums/brews/brewAction';

@Component({
  selector: 'brew-dashboard-information',
  templateUrl: './brew-dashboard-information.component.html',
  styleUrls: ['./brew-dashboard-information.component.scss'],
})
export class BrewDashboardInformationComponent implements OnInit {

  @Input() public brew: Brew;


  @Output() public brewAction: EventEmitter<any> = new EventEmitter();


  public bean: Bean;
  public preparation: Preparation;
  public mill: Mill;

  public settings: Settings;

  constructor(private readonly uiSettingsStorage: UISettingsStorage, private readonly popoverCtrl: PopoverController) {
    this.settings = this.uiSettingsStorage.getSettings();

  }

  public ngOnInit() {
    if (this.brew) {
      this.bean = this.brew.getBean();
      this.preparation = this.brew.getPreparation();
      this.mill = this.brew.getMill();
    }

  }

  public async showBrewActions(event): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: BrewPopoverActionsComponent,
      event,
      translucent: true,
      componentProps: {brew: this.brew}
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    this.brewAction.emit([data.role as BREW_ACTION, this.brew]);
  }


  public getBrewDisplayClass() {
    if (this.brew) {
      if (this.brew.isAwesomeBrew()) {
        return 'awesome-brew';
      } else if (this.brew.isGoodBrew()) {
        return 'good-brew';
      } else if (this.brew.isNormalBrew()) {
        return 'normal-brew';
      } else if (this.brew.isBadBrew()) {
        return 'bad-brew';
      }
    }

    return 'not-rated-brew';
  }

}
