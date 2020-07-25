import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {BEAN_MIX_ENUM} from '../../../enums/beans/mix';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {ROASTS_ENUM} from '../../../enums/beans/roasts';
import {UIHelper} from '../../../services/uiHelper';
import {UIImage} from '../../../services/uiImage';
import {Bean} from '../../../classes/bean/bean';
import {IonSlides, ModalController, NavParams} from '@ionic/angular';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIFileHelper} from '../../../services/uiFileHelper';
import {UIToast} from '../../../services/uiToast';

@Component({
  selector: 'beans-add',
  templateUrl: './beans-add.component.html',
  styleUrls: ['./beans-add.component.scss'],
})
export class BeansAddComponent implements OnInit {

  @ViewChild('photoSlides', {static: false}) public photoSlides: IonSlides;
  public data: Bean = new Bean();
  private readonly bean_template: Bean;
  public roastsEnum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;
  public heartIcons = {
    empty: '../assets/custom-ion-icons/beanconqueror-bean-rating-empty.svg',
    half: '../assets/custom-ion-icons/beanconqueror-bean-rating-half.svg',
    full: '../assets/custom-ion-icons/beanconqueror-bean-rating-full.svg',
  };
  @Input() private hide_toast_message: boolean;

  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiImage: UIImage,
               public uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiFileHelper: UIFileHelper,
               private readonly uiToast: UIToast) {
    this.data.roastingDate = new Date().toISOString();
    this.bean_template = this.navParams.get('bean_template');
  }


  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent('BEAN', 'ADD');
    if (this.bean_template) {
      await this.__loadBean(this.bean_template);
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

  public addBean(): void {

    if (this.__formValid()) {
      this.__addBean();
    }
  }

  public onRoastRate(_event): void {
    this.data.roast_range = _event;
  }

  public __addBean(): void {

    this.uiBeanStorage.add(this.data);
    this.dismiss();
    if (!this.hide_toast_message) {
      this.uiToast.showInfoToast('TOAST_BEAN_ADDED_SUCCESSFULLY');
    }
  }

  public async deleteImage(_index: number): Promise<any> {

    const splicedPaths: Array<string> = this.data.attachments.splice(_index, 1);
    for (const path of splicedPaths) {
      try {
        await this.uiFileHelper.deleteFile(path);
        this.uiToast.showInfoToast('DELETED');
      } catch (ex) {
        this.uiToast.showInfoToast('NOT DELETED');
      }

    }
    if (this.data.attachments.length > 0) {
      // Slide to one item before
      this.photoSlides.slideTo(_index - 1, 0);
    }

  }

  private async __loadBean(_bean: Bean) {
    this.data.name = _bean.name;
    this.data.roastingDate = _bean.roastingDate;
    this.data.note = _bean.note;
    this.data.roaster = _bean.roaster;
    this.data.roast = _bean.roast;
    this.data.beanMix = _bean.beanMix;
    this.data.variety = _bean.variety;
    this.data.country = _bean.country;
    // tslint:disable-next-line
    this.data.roast_custom = _bean.roast_custom;
    this.data.aromatics = _bean.aromatics;
    this.data.weight = _bean.weight;
    this.data.finished = false;
    this.data.cost = _bean.cost;

    const copyAttachments = [];
    for (const attachment of _bean.attachments) {
      try {
        const newPath: string = await this.uiFileHelper.copyFile(attachment);
        copyAttachments.push(newPath);
      } catch (ex) {

      }

    }
    this.data.attachments = copyAttachments;
  }

  public dismiss(): void {
    this.modalController.dismiss({
      'dismissed': true
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

  public ngOnInit() {}


}
