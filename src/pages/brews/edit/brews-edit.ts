/** Core */
import {Component, ViewChild} from '@angular/core';
/** Ionic */
import {NavParams, Slides, ViewController} from 'ionic-angular';
/** Services */
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {UIHelper} from '../../../services/uiHelper';
import {UIImage} from '../../../services/uiImage';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
/** Classes */
import {Brew} from '../../../classes/brew/brew';
/** Interfaces */
import {IBean} from '../../../interfaces/bean/iBean';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
/** Enums */
import {BREW_QUANTITY_TYPES_ENUM} from '../../../enums/brews/brewQuantityTypes';
import {IMill} from '../../../interfaces/mill/iMill';
import {UIMillStorage} from '../../../services/uiMillStorage';

@Component({
  selector: 'brews-edit',
  templateUrl: 'brews-edit.html'
})
export class BrewsEditModal {

  @ViewChild('photoSlides') public photoSlides: Slides;
  public data: Brew = new Brew();

  public brewQuantityTypeEnums = BREW_QUANTITY_TYPES_ENUM;
  public method_of_preparations: Array<IPreparation> = [];
  public beans: Array<IBean> = [];
  public mills: Array<IMill> = [];

  constructor (private readonly viewCtrl: ViewController,
               private readonly navParams: NavParams,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiBrewStorage: UIBrewStorage,
               public uiHelper: UIHelper,
               private readonly uiImage: UIImage,
               private readonly uiMillStorage: UIMillStorage) {

    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const brew: IBrew = this.uiHelper.copyData(this.navParams.get('BREW'));

    this.data.initializeByObject(brew);
    this.method_of_preparations = this.uiPreparationStorage.getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
    this.beans = this.uiBeanStorage.getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
    this.mills = this.uiMillStorage.getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public showRating(): boolean {
    if (this.data !== undefined && this.data.rating >= 0) {
      return true;
    }

    return false;
  }

  public addImage(): void {
    this.uiImage.showOptionChooser()
      .then((_option) => {
      if (_option === 'CHOOSE') {
        // CHOSE
        this.uiImage.choosePhoto()
          .then((_path) => {
          console.log(_path);

          if (_path) {
            this.data.attachments.push(_path.toString());
          }

        });
      } else {
        // TAKE
        this.uiImage.takePhoto()
          .then((_path) => {
          this.data.attachments.push(_path.toString());
        });
      }
    });
  }

  public deleteImage(_index: number): void {
    this.data.attachments.splice(_index, 1);
    if (this.data.attachments.length > 0) {
      // Slide to one item before
      this.photoSlides.slideTo(_index - 1, 0);
    }
  }

  public dismiss(): void {
    this.viewCtrl.dismiss('', undefined, {animate: false});
  }

  public updateBrew(): void {
    this.uiBrewStorage.update(this.data);
    this.dismiss();
  }

}
