import {Component, OnInit} from '@angular/core';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {ModalController, NavParams} from '@ionic/angular';
import {UIBrewHelper} from '../../../services/uiBrewHelper';
import {Preparation} from '../../../classes/preparation/preparation';
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {UIHelper} from '../../../services/uiHelper';
import {Brew} from '../../../classes/brew/brew';
import {IBean} from '../../../interfaces/bean/iBean';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {Bean} from '../../../classes/bean/bean';
import {Settings} from '../../../classes/settings/settings';
import {TranslateService} from '@ngx-translate/core';
import {UIAnalytics} from '../../../services/uiAnalytics';

@Component({
  selector: 'brew-text',
  templateUrl: './brew-text.component.html',
  styleUrls: ['./brew-text.component.scss'],
})
export class BrewTextComponent implements OnInit {


  public brews: Array<Brew> = [];

  public method_of_preparations: Array<IPreparation> = [];
  public beans: Array<IBean> = [];

  public settings: Settings;

  public selectedIBrew: IBrew;
  public selectedBrew: Brew = new Brew();
  public postText: string = '';

  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               public uiHelper: UIHelper,
               public uiBrewHelper: UIBrewHelper,
               private readonly uiSettingsStorage: UISettingsStorage,
               private translate: TranslateService,
               private readonly uiAnalytics: UIAnalytics) {
    this.settings = this.uiSettingsStorage.getSettings();

  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('BREW', 'TEXT');
    this.selectedIBrew = this.navParams.get('brew');
    this.selectedBrew.initializeByObject(this.selectedIBrew);
    this.__generateText();

  }

  public dismiss(): void {
    this.modalController.dismiss({
      'dismissed': true
    });
  }

  private __generateText(): void {
    let buildText: string = '';

    const bean: Bean = this.selectedBrew.getBean();
    const prep: Preparation = this.selectedBrew.getPreparation();
    const brew: Brew = this.selectedBrew;

    buildText += `
${bean.name}
----
${this.translate.instant('PAGE_BREW_TEXT_INFORMATION_FROM_ROASTER')}:
${this.translate.instant('BEAN_DATA_COUNTRY')}: ${bean.country}
${this.translate.instant('BEAN_DATA_ROASTER')}: ${bean.roaster}
${this.translate.instant('BEAN_DATA_ROASTING_DATE')}: ${this.uiHelper.formateDatestr(bean.roastingDate, 'DD.MM.YYYY')}
${this.translate.instant('BEAN_DATA_VARIETY')}: ${bean.variety}
${this.translate.instant('BEAN_DATA_AROMATICS')}: ${bean.aromatics}
${this.translate.instant('BEAN_DATA_WEIGHT')}:${bean.weight}
${this.translate.instant('BEAN_DATA_COST')}: ${bean.cost}
${this.translate.instant('BEAN_DATA_ROAST_NAME')}: ${bean.roast}
${this.translate.instant('NOTES')}: ${bean.note}
-----
${this.translate.instant('BREW_DATA_PREPARATION_METHOD')}: ${prep.name}
-----
${this.translate.instant('THE_BREW')}:
`;

    if (this.settings.grind_size) {
      buildText += `${this.translate.instant('BREW_DATA_GRIND_SIZE')}: ${brew.grind_size}\n`;
    }

    if (this.settings.grind_weight) {
      buildText += `${this.translate.instant('BREW_DATA_GRIND_WEIGHT')}: ${brew.grind_weight}\n`;
    }
    if (this.settings.brew_temperature) {
      buildText += `${this.translate.instant('BREW_DATA_BREW_TEMPERATURE')}: ${brew.brew_temperature}\n`;
    }
    if (this.settings.brew_temperature_time) {
      buildText += `${this.translate.instant('BREW_DATA_TEMPERATURE_TIME')}: ${brew.brew_temperature_time}\n`;
    }
    if (this.settings.brew_time) {
      buildText += `${this.translate.instant('BREW_DATA_TIME')}: ${brew.brew_time}\n`;
    }
    if (this.settings.brew_quantity) {
      buildText += `${this.translate.instant('BREW_DATA_BREW_QUANTITY')}: ${brew.brew_quantity}\n`;
    }
    if (this.settings.coffee_blooming_time) {
      buildText += `${this.translate.instant('BREW_DATA_COFFEE_BLOOMING_TIME')}: ${brew.coffee_blooming_time}\n`;
    }
    if (this.settings.bean_type) {
      buildText += `${this.translate.instant('BREW_INFORMATION_BEAN_AGE')}: ${brew.getCalculatedBeanAge()}\n`;
    }
    if (this.settings.grind_weight && this.settings.brew_quantity) {
      buildText += `${this.translate.instant('BREW_INFORMATION_BREW_RATIO')}: ${brew.getBrewRatio()}\n`;
    }

    if (this.settings.rating) {
      buildText += `${this.translate.instant('BREW_DATA_RATING')}: ${brew.rating} / 10\n`;
    }
    if (this.settings.note) {
      buildText += `${this.translate.instant('NOTES')}: ${brew.note}\n`;
    }

    this.postText = buildText;

  }

  public ngOnInit() {}

}
