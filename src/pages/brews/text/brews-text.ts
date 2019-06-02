/** Core */
import { Component } from '@angular/core';
/** Ionic */
import { NavParams, ViewController } from 'ionic-angular';
import { UIHelper } from '../../../services/uiHelper';
/** Services */
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

/** Classes */
import { Brew } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';

/** Interfaces */
import { Bean } from '../../../classes/bean/bean';
import { Preparation } from '../../../classes/preparation/preparation';
import { IBean } from '../../../interfaces/bean/iBean';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { IPreparation } from '../../../interfaces/preparation/iPreparation';
import { UIBrewHelper } from '../../../services/uiBrewHelper';

@Component({
  selector: 'brews-text',
  templateUrl: 'brews-text.html'
})
export class BrewsTextModal {

  public brews: Array<Brew> = [];

  public method_of_preparations: Array<IPreparation> = [];
  public beans: Array<IBean> = [];

  public settings: Settings;

  public selectedIBrew: IBrew;
  public selectedBrew: Brew = new Brew();
  public postText: string = '';

  constructor(private viewCtrl: ViewController, private navParams: NavParams,
              public uiHelper: UIHelper,
              public uiBrewHelper: UIBrewHelper,
              private uiSettingsStorage: UISettingsStorage) {
    this.settings = this.uiSettingsStorage.getSettings();

  }

  public ionViewWillEnter(): void {
    this.selectedIBrew = this.navParams.get('BREW');
    this.selectedBrew.initializeByObject(this.selectedIBrew);
    this.__generateText();

  }

  public dismiss(): void {
    this.viewCtrl.dismiss('', undefined, {animate: false});
  }

  private __generateText(): void {
    let buildText: string = '';

    const bean: Bean = this.selectedBrew.getBean();
    const prep: Preparation = this.selectedBrew.getPreparation();
    const brew: Brew = this.selectedBrew;

    buildText += `
${bean.name}
----
Angaben vom Röster:
Herkunftsland: ${bean.country}
Röster: ${bean.roaster}
Röstdatum: ${this.uiHelper.formateDatestr(bean.roastingDate, 'DD.MM.YYYY')}
Varität: ${bean.variety}
Aromen: ${bean.aromatics}
Gewicht:${bean.weight}
Kosten: ${bean.cost}
Röstgrad: ${bean.roast}
Notizen: ${bean.note}
-----
Zubereitung: ${prep.name}
-----
Bezug:
`;

    if (this.settings.grind_size === true) {
    buildText += `Mahlgrad: ${brew.grind_size}\n`;
  }

    if (this.settings.grind_weight === true) {
      buildText += `Gewicht: ${brew.grind_weight}\n`;
    }
    if (this.settings.brew_temperature === true) {
      buildText += `Brühtemperatur: ${brew.brew_temperature}\n`;
    }
    if (this.settings.brew_temperature_time === true) {
      buildText += `Temperaturzeit: ${brew.brew_temperature_time}\n`;
    }
    if (this.settings.brew_time === true) {
      buildText += `Brühzeit: ${brew.brew_time}\n`;
    }
    if (this.settings.brew_quantity === true) {
      buildText += `Bezugsmenge: ${brew.brew_quantity}\n`;
    }
    if (this.settings.coffee_blooming_time === true) {
      buildText += `Blooming-Zeit Preinfusion: ${brew.coffee_blooming_time}\n`;
    }
    if (this.settings.bean_type === true) {
      buildText += `Bohnenalter: ${brew.getCalculatedBeanAge()}\n`;
    }
    if (this.settings.grind_weight === true && this.settings.brew_quantity) {
      buildText += `Brührate: ${brew.getBrewRatio()}\n`;
    }

    if (this.settings.rating === true) {
      buildText += `Bewertung: ${brew.rating} / 10\n`;
    }
    if (this.settings.note === true) {
      buildText += `Notizen: ${brew.note}\n`;
    }

    this.postText = buildText;

  }

}
