import {Component, OnInit, ViewChild} from '@angular/core';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {IPreparation} from '../../../interfaces/preparation/iPreparation';
import {BREW_QUANTITY_TYPES_ENUM} from '../../../enums/brews/brewQuantityTypes';
import {UIHelper} from '../../../services/uiHelper';
import {IMill} from '../../../interfaces/mill/iMill';
import {UIBrewStorage} from '../../../services/uiBrewStorage';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {IonSlides, ModalController, NavParams} from '@ionic/angular';
import {UIMillStorage} from '../../../services/uiMillStorage';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {UIImage} from '../../../services/uiImage';
import {Brew} from '../../../classes/brew/brew';
import {IBean} from '../../../interfaces/bean/iBean';
import * as moment from 'moment';

@Component({
  selector: 'brew-edit',
  templateUrl: './brew-edit.component.html',
  styleUrls: ['./brew-edit.component.scss'],
})
export class BrewEditComponent implements OnInit {


  @ViewChild('photoSlides') public photoSlides: IonSlides;
  public data: Brew = new Brew();

  public brewQuantityTypeEnums = BREW_QUANTITY_TYPES_ENUM;
  public method_of_preparations: Array<IPreparation> = [];
  public beans: Array<IBean> = [];
  public mills: Array<IMill> = [];

  public customCreationDate: string = '';

  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiBrewStorage: UIBrewStorage,
               public uiHelper: UIHelper,
               private readonly uiImage: UIImage,
               private readonly uiMillStorage: UIMillStorage) {

    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    const brew: IBrew = this.uiHelper.copyData(this.navParams.get('brew'));

    this.data.initializeByObject(brew);
    this.method_of_preparations = this.uiPreparationStorage.getAllEntries()
        .sort((a, b) => a.name.localeCompare(b.name));
    this.beans = this.uiBeanStorage.getAllEntries()
        .sort((a, b) => a.name.localeCompare(b.name));
    this.mills = this.uiMillStorage.getAllEntries()
        .sort((a, b) => a.name.localeCompare(b.name));
  }

  public ionViewWillEnter() {

    this.customCreationDate = moment.unix(this.data.config.unix_timestamp).toISOString();
    console.log(this.customCreationDate);
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
    this.modalController.dismiss({
      'dismissed': true
    });
  }

  public updateBrew(): void {
    const newUnix = moment(this.customCreationDate).unix();
    if (newUnix !== this.data.config.unix_timestamp) {
      console.log('New unix timestamp set');
      this.data.config.unix_timestamp = newUnix;
    }

    this.uiBrewStorage.update(this.data);
    this.dismiss();
  }

  public ngOnInit() {}

}
