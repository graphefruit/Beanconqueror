/**Core**/
import {Component, ViewChild, ElementRef, Renderer2} from '@angular/core';
/**Ionic**/
import {ViewController, NavParams, Slides, ModalController} from 'ionic-angular';
/**Services**/
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {UIHelper} from '../../../services/uiHelper';
import {UIImage} from '../../../services/uiImage';

/**Classes**/
import {Brew} from '../../../classes/brew/brew';
import {Settings} from '../../../classes/settings/settings';

/**Interfaces**/
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {IBean} from '../../../interfaces/bean/iBean';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {BrewView} from "../../../classes/brew/brewView";
import {UIBrewStorage} from "../../../services/uiBrewStorage";
import {BrewsAddModal} from "../add/brews-add";
import {UIMillStorage} from "../../../services/uiMillStorage";
import {UIBrewHelper} from "../../../services/uiBrewHelper";


@Component({
  selector: 'brews-table',
  templateUrl: 'brews-table.html',
})
export class BrewsTableModal {

  @ViewChild("tableEl",) tableEl: ElementRef;
  public brews: Array<Brew> = [];


  private startingFontSize: number = 14;

  method_of_preparations: Array<IPreparation> = [];
  beans: Array<IBean> = [];

  public settings: Settings;

  public hasBeans: boolean = false;
  public hasPreparationMethods: boolean = false;
  public hasMills: boolean = false;

  constructor(private viewCtrl: ViewController, private navParams: NavParams, private uiBeanStorage: UIBeanStorage,
              private uiPreparationStorage: UIPreparationStorage,
              public uiHelper: UIHelper, private uiImage: UIImage,
              public uiBrewHelper:UIBrewHelper,
              private uiSettingsStorage: UISettingsStorage, private uiBrewStorage: UIBrewStorage,
              private renderer: Renderer2, private modalCtrl:ModalController,
              private uiMillStorage:UIMillStorage) {
    this.settings = this.uiSettingsStorage.getSettings();

    //Moved from ionViewDidEnter, because of Ionic issues with ion-range

    this.method_of_preparations = this.uiPreparationStorage.getAllEntries();
    this.beans = this.uiBeanStorage.getAllEntries();
    this.hasBeans = (this.uiBeanStorage.getAllEntries().length > 0);
    this.hasPreparationMethods = (this.uiPreparationStorage.getAllEntries().length > 0);
    this.hasMills = (this.uiMillStorage.getAllEntries().length > 0);
    this.__initializeBrews();
  }



  public addBrew() {
    let addBrewsModal = this.modalCtrl.create(BrewsAddModal, {});
    addBrewsModal.onDidDismiss(() => {
      this.__initializeBrews();
    });
    addBrewsModal.present({animate: false});
  }

  scaleFontBigger() {
    this.startingFontSize++;
    this.renderer.setStyle(this.tableEl.nativeElement, "fontSize", this.startingFontSize + "px");

  }

  scaleFontSmaller() {
    this.startingFontSize--;
    if (this.startingFontSize < 6) {
      this.startingFontSize = 6;
    }
    this.renderer.setStyle(this.tableEl.nativeElement, "fontSize", this.startingFontSize + "px");
  }

  dismiss() {
    this.viewCtrl.dismiss("", null, {animate: false});
  }

  private __initializeBrews() {
    this.brews = this.uiBrewStorage.getAllEntries();


    //sort latest to top.
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
