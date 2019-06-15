/** Core */
import {Component, ElementRef, Renderer2, ViewChild} from '@angular/core';
/** Ionic */
import {ModalController, ViewController} from 'ionic-angular';
/** Classes */
import {Brew} from '../../../classes/brew/brew';
import {Settings} from '../../../classes/settings/settings';
/** Services */
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {UIHelper} from '../../../services/uiHelper';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
/** Interfaces */
import {IBean} from '../../../interfaces/bean/iBean';
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {UIBrewHelper} from '../../../services/uiBrewHelper';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {UIMillStorage} from '../../../services/uiMillStorage';
import {BrewsAddModal} from '../add/brews-add';

@Component({
  selector: 'brews-table',
  templateUrl: 'brews-table.html'
})
export class BrewsTableModal {

  @ViewChild('tableEl') public tableEl: ElementRef;
  public brews: Array<Brew> = [];

  public method_of_preparations: Array<IPreparation> = [];
  public beans: Array<IBean> = [];

  public settings: Settings;

  public hasBeans: boolean = false;
  public hasPreparationMethods: boolean = false;
  public hasMills: boolean = false;

  private startingFontSize: number = 14;

  constructor (private readonly viewCtrl: ViewController,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiPreparationStorage: UIPreparationStorage,
               public uiHelper: UIHelper,
               public uiBrewHelper: UIBrewHelper,
               private readonly uiSettingsStorage: UISettingsStorage,
               private readonly uiBrewStorage: UIBrewStorage,
               private readonly renderer: Renderer2,
               private readonly modalCtrl: ModalController,
               private readonly uiMillStorage: UIMillStorage) {
    this.settings = this.uiSettingsStorage.getSettings();

    // Moved from ionViewDidEnter, because of Ionic issues with ion-range

    this.method_of_preparations = this.uiPreparationStorage.getAllEntries();
    this.beans = this.uiBeanStorage.getAllEntries();
    this.hasBeans = (this.uiBeanStorage.getAllEntries().length > 0);
    this.hasPreparationMethods = (this.uiPreparationStorage.getAllEntries().length > 0);
    this.hasMills = (this.uiMillStorage.getAllEntries().length > 0);
    this.__initializeBrews();
  }

  public addBrew(): void {
    const addBrewsModal = this.modalCtrl.create(BrewsAddModal, {});
    addBrewsModal.onDidDismiss(() => {
      this.__initializeBrews();
    });
    addBrewsModal.present({animate: false});
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
    this.viewCtrl.dismiss('', undefined, {animate: false});
  }

  private __initializeBrews(): void {
    this.brews = this.uiBrewStorage.getAllEntries();

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

}
