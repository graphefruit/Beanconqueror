import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Brew} from '../../classes/brew/brew';
import {Bean} from '../../classes/bean/bean';
import {Preparation} from '../../classes/preparation/preparation';
import {Mill} from '../../classes/mill/mill';
import {Settings} from '../../classes/settings/settings';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {PopoverController} from '@ionic/angular';

@Component({
  selector: 'brew-dashboard-information',
  templateUrl: './brew-dashboard-information.component.html',
  styleUrls: ['./brew-dashboard-information.component.scss'],
})
export class BrewDashboardInformationComponent implements OnInit {

  @Input() public brew: Brew;


  @Output() public openBrew: EventEmitter<any> = new EventEmitter();


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

  public openBrewClick() {
    this.openBrew.emit([this.brew]);
  }


}
