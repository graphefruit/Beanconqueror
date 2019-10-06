import { Component, OnInit } from '@angular/core';
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
               private readonly uiSettingsStorage: UISettingsStorage) {
    this.settings = this.uiSettingsStorage.getSettings();

  }

  public ionViewWillEnter(): void {
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

    if (this.settings.grind_size) {
      buildText += `Mahlgrad: ${brew.grind_size}\n`;
    }

    if (this.settings.grind_weight) {
      buildText += `Gewicht: ${brew.grind_weight}\n`;
    }
    if (this.settings.brew_temperature) {
      buildText += `Brühtemperatur: ${brew.brew_temperature}\n`;
    }
    if (this.settings.brew_temperature_time) {
      buildText += `Temperaturzeit: ${brew.brew_temperature_time}\n`;
    }
    if (this.settings.brew_time) {
      buildText += `Brühzeit: ${brew.brew_time}\n`;
    }
    if (this.settings.brew_quantity) {
      buildText += `Bezugsmenge: ${brew.brew_quantity}\n`;
    }
    if (this.settings.coffee_blooming_time) {
      buildText += `Blooming-Zeit Preinfusion: ${brew.coffee_blooming_time}\n`;
    }
    if (this.settings.bean_type) {
      buildText += `Bohnenalter: ${brew.getCalculatedBeanAge()}\n`;
    }
    if (this.settings.grind_weight && this.settings.brew_quantity) {
      buildText += `Brührate: ${brew.getBrewRatio()}\n`;
    }

    if (this.settings.rating) {
      buildText += `Bewertung: ${brew.rating} / 10\n`;
    }
    if (this.settings.note) {
      buildText += `Notizen: ${brew.note}\n`;
    }

    this.postText = buildText;

  }

  public ngOnInit() {}

}
