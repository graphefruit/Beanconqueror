import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {IonSlides, ModalController, NavParams} from '@ionic/angular';
import {BEAN_MIX_ENUM} from '../../../enums/beans/mix';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {ROASTS_ENUM} from '../../../enums/beans/roasts';
import {UIHelper} from '../../../services/uiHelper';
import {UIImage} from '../../../services/uiImage';
import {IBean} from '../../../interfaces/bean/iBean';
import {Bean} from '../../../classes/bean/bean';
import {UIAnalytics} from '../../../services/uiAnalytics';

@Component({
  selector: 'beans-edit',
  templateUrl: './beans-edit.component.html',
  styleUrls: ['./beans-edit.component.scss'],
})
export class BeansEditComponent implements OnInit {

  public data: Bean = new Bean();
  public roastsEnum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;
  @Input() private bean: IBean;
  @ViewChild('photoSlides', {static: false}) public photoSlides: IonSlides;

  constructor (private readonly navParams: NavParams,
               private readonly modalController: ModalController,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiImage: UIImage,
               private readonly uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics) {
    this.data.roastingDate = new Date().toISOString();
  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('BEAN', 'EDIT');
    //  this.bean = this.navParams.get('BEAN');
    this.data.initializeByObject(this.bean);
  }
  public editBean(): void {
    if (this.__formValid()) {
      this.__editBean();
    }
  }


  public addImage(): void {
    this.uiImage.showOptionChooser()
      .then((_option) => {
        if (_option === 'CHOOSE') {
          // CHOSE
          this.uiImage.choosePhoto()
            .then((_path) => {
              this.data.attachments.push(_path.toString());
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
      dismissed: true
    });
  }
  private __formValid(): boolean {
    let valid: boolean = true;
    const name: string = this.data.name;
    if (name === undefined || name.trim() === '') {
      valid = false;
    }

    return valid;
  }
  private __editBean(): void {
    this.uiBeanStorage.update(this.data);
    this.dismiss();
  }

  public ngOnInit() {}

}
