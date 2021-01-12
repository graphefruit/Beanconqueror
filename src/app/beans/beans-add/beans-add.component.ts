import {ChangeDetectorRef, Component, Input, OnInit, ViewChild} from '@angular/core';
import {BEAN_MIX_ENUM} from '../../../enums/beans/mix';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {ROASTS_ENUM} from '../../../enums/beans/roasts';
import {UIHelper} from '../../../services/uiHelper';
import {UIImage} from '../../../services/uiImage';
import {Bean} from '../../../classes/bean/bean';
import {IonSlides, ModalController, NavParams, Platform} from '@ionic/angular';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIFileHelper} from '../../../services/uiFileHelper';
import {UIToast} from '../../../services/uiToast';


import {TranslateService} from '@ngx-translate/core';
import moment from 'moment';
import {IBeanInformation} from '../../../interfaces/bean/iBeanInformation';
import {NgxStarsComponent} from 'ngx-stars';
import {BEAN_ROASTING_TYPE_ENUM} from '../../../enums/beans/beanRoastingType';

declare var cordova: any;
@Component({
  selector: 'beans-add',
  templateUrl: './beans-add.component.html',
  styleUrls: ['./beans-add.component.scss'],
})
export class BeansAddComponent implements OnInit {

  @ViewChild('photoSlides', {static: false}) public photoSlides: IonSlides;
  @ViewChild('beanStars', {read: NgxStarsComponent, static: false}) public beanStars: NgxStarsComponent;
  public data: Bean = new Bean();
  private readonly bean_template: Bean;
  public roastsEnum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;
  public beanRoastingTypeEnum = BEAN_ROASTING_TYPE_ENUM;
  @Input() private hide_toast_message: boolean;


  public roasterResultsAvailable: boolean = false;
  public roasterResults: string[] = [];
  // Preset on start, else if value is filled the popup will be shown
  public ignoreNextChange: boolean = false;
  public visibleIndex: any = {};

  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiImage: UIImage,
               public uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiFileHelper: UIFileHelper,
               private readonly uiToast: UIToast,
               private readonly translate: TranslateService,
               private readonly platform: Platform,
               private readonly changeDetectorRef: ChangeDetectorRef) {
    this.bean_template = this.navParams.get('bean_template');
  }

  public onRoasterSearchChange(event: any) {
    let actualSearchValue = event.target.value;
    this.roasterResults = [];
    this.roasterResultsAvailable = false;
    if (actualSearchValue === undefined || actualSearchValue === '') {
      return;
    }
    if (this.ignoreNextChange) {
      this.ignoreNextChange = false;
      return;
    }

    actualSearchValue = actualSearchValue.toLowerCase();
    const filteredEntries = this.uiBeanStorage.getAllEntries().filter((e)=>e.roaster.toLowerCase().startsWith(actualSearchValue));

    for (const entry of filteredEntries) {
      this.roasterResults.push(entry.roaster);
    }
    // Distinct values
    this.roasterResults = Array.from(new Set(this.roasterResults.map((e) => e)));

    if (this.roasterResults.length > 0) {
      this.roasterResultsAvailable = true;
    } else {
      this.roasterResultsAvailable = false;
    }

  }
  public onRoasterSearchLeave($event) {
    setTimeout(() => {
      this.roasterResultsAvailable = false;
      this.roasterResults = [];
    },150);

  }

  public roasterSelected(selected: string) :void {
    this.data.roaster = selected;
    this.roasterResults = [];
    this.roasterResultsAvailable = false;
    this.ignoreNextChange = true;
  }



  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent('BEAN', 'ADD');
    if (this.bean_template) {
      await this.__loadBean(this.bean_template);
    }

    // Add one empty bean information, rest is being updated on start
    if (this.data.bean_information.length <=0) {
      const beanInformation: IBeanInformation = {} as IBeanInformation;
      this.data.bean_information.push(beanInformation);
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
    this.beanStars.setRating(this.data.roast_range);
  }

  public addAnotherSort() {
    const beanInformation: IBeanInformation = {} as IBeanInformation;
    this.data.bean_information.push(beanInformation);
  }

  public deleteSortInformation(_index: number) {
    this.data.bean_information.splice(_index, 1);
    this.visibleIndex[_index] = false;
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
        this.uiToast.showInfoToast('IMAGE_DELETED');
      } catch (ex) {
        this.uiToast.showInfoToast('IMAGE_NOT_DELETED');
      }

    }
    if (this.data.attachments.length > 0) {
      // Slide to one item before
      this.photoSlides.slideTo(_index - 1, 0);
    }

  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'bean-add');
  }

  private async __loadBean(_bean: Bean) {
    this.data.name = _bean.name;
    this.data.roastingDate = _bean.roastingDate;
    this.data.note = _bean.note;
    this.data.roaster = _bean.roaster;
    if (this.data.roaster !== '') {
      this.ignoreNextChange = true;
    }
    this.data.roast = _bean.roast;
    this.data.beanMix = _bean.beanMix;

    // tslint:disable-next-line
    this.data.roast_custom = _bean.roast_custom;
    this.data.aromatics = _bean.aromatics;
    this.data.weight = _bean.weight;
    this.data.finished = false;
    this.data.cost = _bean.cost;

    this.data.bean_roasting_type = _bean.bean_roasting_type;
    this.data.decaffeinated = _bean.decaffeinated;
    this.data.url = _bean.url;
    this.data.ean_article_number = _bean.ean_article_number;

    this.data.bean_information = _bean.bean_information;
    this.data.cupping_points = _bean.cupping_points;
    this.data.roast_range = _bean.roast_range;


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

  private __formValid(): boolean {
    let valid: boolean = true;
    const name: string = this.data.name;
    if (name === undefined || name.trim() === '') {
      valid = false;
    }

    return valid;
  }

  public ngOnInit() {}
  public chooseDate(_event) {
    if (this.platform.is('cordova')) {
      _event.cancelBubble = true;
      _event.preventDefault();
      _event.stopImmediatePropagation();
      _event.stopPropagation();


      const myDate = new Date(); // From model.

      cordova.plugins.DateTimePicker.show({
        mode: 'date',
        date: myDate,
        okText: this.translate.instant('CHOOSE'),
        todayText: this.translate.instant('TODAY'),
        cancelText: this.translate.instant('CANCEL'),
        success: (newDate) => {
          this.data.roastingDate = moment(newDate).toISOString();
          this.changeDetectorRef.detectChanges();
        }, error: () => {

        }
      });

    }
  }

  public beanMixChanged() {
    if (this.data.beanMix !== BEAN_MIX_ENUM.BLEND) {
      const beanInfo:IBeanInformation = this.data.bean_information[0];
      this.data.bean_information = [];
      this.data.bean_information.push(beanInfo);
    }
  }

}
