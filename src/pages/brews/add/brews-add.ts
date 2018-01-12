/**Core**/
import {Component, ViewChild} from '@angular/core';
/**Ionic**/
import {ViewController,Slides} from 'ionic-angular';

/**Services**/
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {UIImage} from '../../../services/uiImage';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIHelper} from '../../../services/uiHelper';
/**Components**/
import {TimerComponent} from '../../../components/timer/timer';

/**Enums**/
import {BREW_VIEW_ENUM} from '../../../enums/settings/brewView';


/**Classes**/
import {Brew} from '../../../classes/brew/brew';

/**Interfaces**/
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {IBean} from '../../../interfaces/bean/iBean';
import {ISettings} from '../../../interfaces/settings/iSettings';

@Component({
  selector: 'brews-add',
  templateUrl: 'brews-add.html',
})
export class BrewsAddModal {
  @ViewChild('photoSlides') photoSlides: Slides;
  @ViewChild(TimerComponent) timer: TimerComponent;

  public data: Brew = new Brew();

  public BREW_VIEW_ENUM = BREW_VIEW_ENUM;
  public settings:ISettings;

  public method_of_preparations: Array<IPreparation> = [];
  beans: Array<IBean> = [];

  constructor(private viewCtrl: ViewController, private uiBeanStorage: UIBeanStorage, private uiPreparationStorage: UIPreparationStorage,
              private uiBrewStorage: UIBrewStorage, private uiImage: UIImage, private uiSettingsStorage:UISettingsStorage, public uiHelper:UIHelper) {
    //Initialize to standard in dropdowns

    this.settings = this.uiSettingsStorage.getSettings();
    this.method_of_preparations = this.uiPreparationStorage.getAllEntries();
    this.beans = this.uiBeanStorage.getAllEntries();

    //Get first entry
    this.data.bean = this.beans[0].config.uuid;
    this.data.method_of_preparation = this.method_of_preparations[0].config.uuid;
  }



  dismiss() {
    this.viewCtrl.dismiss("", null, {animate: false});
  }

  public finish() {
    this.stopTimer();
    this.uiBrewStorage.add(this.data);
    this.dismiss();
  }


  public getTime():number{
    return this.timer.getSeconds();
  }

  public setCoffeeDripTime(){
    this.data.coffee_first_drip_time = this.getTime();
  }
  public setCoffeeBloomingTime(){
    this.data.coffee_blooming_time = this.getTime();
  }

  public addImage() {
    this.uiImage.showOptionChooser().then((_option) => {
      if (_option === "CHOOSE") {
        //CHOSE
        this.uiImage.choosePhoto().then((_path) => {
          console.log(_path);

          if (_path) {
            this.data.attachments.push(_path.toString());
          }

        }, () => {

        })
      }
      else {
        //TAKE
        this.uiImage.takePhoto().then((_path) => {
          this.data.attachments.push(_path.toString());
        }, () => {

        })
      }
    });
  }

  public deleteImage(_index: number) {
    this.data.attachments.splice(_index, 1);
    if (this.data.attachments.length > 0) {
      //Slide to one item before
      this.photoSlides.slideTo(_index - 1, 0);
    }

  }

  public stopTimer() {
    if (this.timer){
      this.timer.pauseTimer();
      this.data.brew_time = this.timer.getSeconds();
    }
    else{
      this.data.brew_time = 0;
    }

  }




}
