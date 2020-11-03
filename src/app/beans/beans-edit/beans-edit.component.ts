import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {IonSlides, ModalController, NavParams, Platform} from '@ionic/angular';
import {BEAN_MIX_ENUM} from '../../../enums/beans/mix';
import {UIBeanStorage} from '../../../services/uiBeanStorage';
import {ROASTS_ENUM} from '../../../enums/beans/roasts';
import {UIHelper} from '../../../services/uiHelper';
import {UIImage} from '../../../services/uiImage';
import {IBean} from '../../../interfaces/bean/iBean';
import {Bean} from '../../../classes/bean/bean';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {UIToast} from '../../../services/uiToast';
import {UIFileHelper} from '../../../services/uiFileHelper';
import moment from 'moment';
import {DatePicker} from '@ionic-native/date-picker/ngx';
import {TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'beans-edit',
  templateUrl: './beans-edit.component.html',
  styleUrls: ['./beans-edit.component.scss'],
})
export class BeansEditComponent implements OnInit {

  public data: Bean = new Bean();
  public roastsEnum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;
  public heartIcons = {
    empty: '../assets/custom-ion-icons/beanconqueror-bean-rating-empty.svg',
    half: '../assets/custom-ion-icons/beanconqueror-bean-rating-half.svg',
    full: '../assets/custom-ion-icons/beanconqueror-bean-rating-full.svg',
  };
  // Needed for the rating element, if we set the initial stars before loading, we cant change it anymore.
  public viewLoaded: boolean = false;

  @Input() private bean: IBean;
  @ViewChild('photoSlides', {static: false}) public photoSlides: IonSlides;


  public roasterResultsAvailable: boolean = false;
  public roasterResults: string[] = [];
  // Preset on start, else if value is filled the popup will be shown
  public ignoreNextChange: boolean = true;

  constructor (private readonly navParams: NavParams,
               private readonly modalController: ModalController,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiImage: UIImage,
               private readonly uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiToast: UIToast,
               private readonly uiFileHelper: UIFileHelper,
               private readonly datePicker: DatePicker,
               private readonly translate: TranslateService,
               private readonly platform: Platform) {
    // this.data.roastingDate = new Date().toISOString();
  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('BEAN', 'EDIT');
    this.data.initializeByObject(this.bean);
    this.viewLoaded = true;
  }
  public editBean(): void {
    if (this.__formValid()) {
      this.__editBean();
    }
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

  public async deleteImage(_index: number) {
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

  public onRoastRate(_event): void {
    this.data.roast_range = _event;
  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'bean-edit');
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
    this.uiToast.showInfoToast('TOAST_BEAN_EDITED_SUCCESSFULLY');
    this.dismiss();
  }

  public ngOnInit() {}
  public chooseDate(_event) {
    if (this.platform.is('cordova')) {
      _event.cancelBubble = true;
      _event.preventDefault();
      _event.stopImmediatePropagation();
      _event.stopPropagation();
      this.datePicker.show({
        date: new Date(),
        mode: 'date',
        androidTheme: this.datePicker.ANDROID_THEMES.THEME_DEVICE_DEFAULT_LIGHT,
        okText: this.translate.instant('CHOOSE'),
        todayText: this.translate.instant('TODAY'),
        cancelText: this.translate.instant('CANCEL'),
      }).then(
        (date) => {
          this.data.roastingDate = moment(date).toISOString();
        },
        (err) => {

        }

      );
    }
  }
}
