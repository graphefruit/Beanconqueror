import {Component, ElementRef, OnInit, Renderer2, ViewChild} from '@angular/core';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {UIHelper} from '../../../services/uiHelper';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIBrewHelper} from '../../../services/uiBrewHelper';
import {UIMillStorage} from '../../../services/uiMillStorage';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {ModalController} from '@ionic/angular';
import {Brew} from '../../../classes/brew/brew';
import {IBean} from '../../../interfaces/bean/iBean';
import {Settings} from '../../../classes/settings/settings';
import {BrewAddComponent} from '../brew-add/brew-add.component';
import {UIAnalytics} from '../../../services/uiAnalytics';

@Component({
  selector: 'brew-table',
  templateUrl: './brew-table.component.html',
  styleUrls: ['./brew-table.component.scss'],
})
export class BrewTableComponent implements OnInit {

  @ViewChild('tableEl', {static: false}) public tableEl: ElementRef;
  public brews: Array<Brew> = [];

  public method_of_preparations: Array<IPreparation> = [];
  public beans: Array<IBean> = [];

  public settings: Settings;

  public hasBeans: boolean = false;
  public hasPreparationMethods: boolean = false;
  public hasMills: boolean = false;

  private startingFontSize: number = 14;

  constructor (private readonly modalController: ModalController,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiPreparationStorage: UIPreparationStorage,
               public uiHelper: UIHelper,
               public uiBrewHelper: UIBrewHelper,
               private readonly uiSettingsStorage: UISettingsStorage,
               private readonly uiBrewStorage: UIBrewStorage,
               private readonly renderer: Renderer2,
               private readonly modalCtrl: ModalController,
               private readonly uiMillStorage: UIMillStorage,
               private readonly uiAnalytics: UIAnalytics) {
    this.settings = this.uiSettingsStorage.getSettings();

    // Moved from ionViewDidEnter, because of Ionic issues with ion-range

    this.method_of_preparations = this.uiPreparationStorage.getAllEntries();
    this.beans = this.uiBeanStorage.getAllEntries();
    this.hasBeans = (this.uiBeanStorage.getAllEntries().length > 0);
    this.hasPreparationMethods = (this.uiPreparationStorage.getAllEntries().length > 0);
    this.hasMills = (this.uiMillStorage.getAllEntries().length > 0);
    this.__initializeBrews();
  }

  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent('BREW', 'TABLE');
  }

  public async addBrew() {
    const modal = await this.modalCtrl.create({component:BrewAddComponent});
    await modal.present();
    await modal.onWillDismiss();
    this.__initializeBrews();

  }

  public scaleFontBigger(): void {
    this.startingFontSize++;
    this.renderer.setStyle(this.tableEl.nativeElement, 'fontSize', `${this.startingFontSize}px`);

  }

  public scaleFontSmaller(): void {
    this.startingFontSize--;
    if (this.startingFontSize < 6) {
      this.startingFontSize = 6;
    }
    this.renderer.setStyle(this.tableEl.nativeElement, 'fontSize', `${this.startingFontSize}px`);
  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    });
  }

  private __initializeBrews(): void {
    this.brews = this.uiBrewStorage.getAllEntries();

    this.__sortBrews();
  }

  private __sortBrews(): void {
    // sort latest to top.
    this.brews = this.brews.sort((obj1, obj2) => {
      if (obj1.config.unix_timestamp < obj2.config.unix_timestamp) {
        return 1;
      }
      if (obj1.config.unix_timestamp > obj2.config.unix_timestamp) {
        return -1;
      }

      return 0;
    });
  }
  public ngOnInit() {}

}
