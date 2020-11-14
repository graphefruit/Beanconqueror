import {Component, EventEmitter, Input, OnInit, Output, SimpleChange, ViewChild} from '@angular/core';
import {Brew} from '../../classes/brew/brew';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {Settings} from '../../classes/settings/settings';
import {PopoverController} from '@ionic/angular';
import {BREW_ACTION} from '../../enums/brews/brewAction';
import {BrewPopoverActionsComponent} from '../../app/brew/brew-popover-actions/brew-popover-actions.component';
import {Bean} from '../../classes/bean/bean';
import {Preparation} from '../../classes/preparation/preparation';
import {Mill} from '../../classes/mill/mill';
import {BREW_QUANTITY_TYPES_ENUM} from '../../enums/brews/brewQuantityTypes';
import {PREPARATION_STYLE_TYPE} from '../../enums/preparations/preparationStyleTypes';
import {NgxStarsComponent} from 'ngx-stars';

@Component({
  selector: 'brew-information',
  templateUrl: './brew-information.component.html',
  styleUrls: ['./brew-information.component.scss'],

})
export class BrewInformationComponent implements OnInit {
  @Input() public brew: Brew;

  @ViewChild('brewStars', {read: NgxStarsComponent, static: false}) public brewStars: NgxStarsComponent;
  @Output() public brewAction: EventEmitter<any> = new EventEmitter();
  public PREPARATION_STYLE_TYPE = PREPARATION_STYLE_TYPE;

  public bean: Bean;
  public preparation: Preparation;
  public mill: Mill;
  public brewQuantityEnum = BREW_QUANTITY_TYPES_ENUM;
  public settings: Settings;

  public brewIcons = {
    empty: '../assets/custom-ion-icons/beanconqueror-brew-rating-empty.svg',
    full: '../assets/custom-ion-icons/beanconqueror-brew-rating-full.svg',
  };

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

  public ngOnChanges(changes: SimpleChange) {
    // changes.prop contains the old and the new value...
    try {
      console.log("tadaaa");
      const previousValue = changes['brew'].previousValue as Brew;
      const currentValue =  changes['brew'].currentValue as Brew;
      if (previousValue.rating !== currentValue.rating) {
        this.brewStars.setRating(currentValue.rating);
      }

    }catch (ex) {

    }

  }

  public async showBrewActions(event): Promise<void> {
    const popover = await this.popoverCtrl.create({
      component: BrewPopoverActionsComponent,
      event,
      translucent: true,
      componentProps: {brew: this.brew},
      id:'brew-popover-actions',
    });
    await popover.present();
    const data = await popover.onWillDismiss();
    this.brewAction.emit([data.role as BREW_ACTION, this.brew]);
  }


}
