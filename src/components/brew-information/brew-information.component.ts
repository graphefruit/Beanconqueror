import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Brew} from '../../classes/brew/brew';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {Settings} from '../../classes/settings/settings';
import {PopoverController} from '@ionic/angular';
import {BREW_ACTION} from '../../enums/brews/brewAction';
import {BrewPopoverActionsComponent} from '../../app/brew/brew-popover-actions/brew-popover-actions.component';
import {Bean} from '../../classes/bean/bean';
import {Preparation} from '../../classes/preparation/preparation';
import {Mill} from '../../classes/mill/mill';

@Component({
  selector: 'brew-information',
  templateUrl: './brew-information.component.html',
  styleUrls: ['./brew-information.component.scss'],
})
export class BrewInformationComponent implements OnInit {
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
    this.bean = this.brew.getBean();
    this.preparation = this.brew.getPreparation();
    this.mill = this.brew.getMill();
  }

  public async showBrewActions(event, brew: Brew): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: BrewPopoverActionsComponent,
      event,
      translucent: true,
      componentProps: {brew}
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    this.brewAction.emit([data.role as BREW_ACTION, brew]);
  }


  public getBrewDisplayClass() {
    if (this.brew.rating === 8) {
      debugger;
    }
    if (this.brew.isAwesomeBrew()) {
      return 'awesome-brew';
    } else if (this.brew.isGoodBrew()) {
      return 'good-brew';
    } else if (this.brew.isNormalBrew()) {
      return 'normal-brew';
    } else if (this.brew.isBadBrew()) {
      return 'bad-brew';
    }
    return 'not-rated-brew';
  }
}
