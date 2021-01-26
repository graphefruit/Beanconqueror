import {ChangeDetectorRef, Component, Input, OnInit, ViewChild} from '@angular/core';
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

import {TranslateService} from '@ngx-translate/core';
import {IBeanInformation} from '../../../interfaces/bean/iBeanInformation';
import {NgxStarsComponent} from 'ngx-stars';
import {BEAN_ROASTING_TYPE_ENUM} from '../../../enums/beans/beanRoastingType';

declare var cordova: any;
@Component({
  selector: 'beans-edit',
  templateUrl: './beans-edit.component.html',
  styleUrls: ['./beans-edit.component.scss'],
})
export class BeansEditComponent implements OnInit {

  public data: Bean;
  public roastsEnum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;
  public beanRoastingTypeEnum = BEAN_ROASTING_TYPE_ENUM;
  @ViewChild('beanStars', {read: NgxStarsComponent, static: false}) public beanStars: NgxStarsComponent;


  @Input() public bean: IBean;


  public roasterResultsAvailable: boolean = false;
  public roasterResults: string[] = [];
  // Preset on start, else if value is filled the popup will be shown
  public ignoreNextChange: boolean = false;
  public visibleIndex: any = {};
  constructor (private readonly navParams: NavParams,
               private readonly modalController: ModalController,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiImage: UIImage,
               private readonly uiHelper: UIHelper,
               private readonly uiAnalytics: UIAnalytics,
               private readonly uiToast: UIToast,
               private readonly uiFileHelper: UIFileHelper,
               private readonly translate: TranslateService,
               private readonly platform: Platform,
               private readonly changeDetectorRef: ChangeDetectorRef) {
  }

  public ionViewWillEnter(): void {
    this.uiAnalytics.trackEvent('BEAN', 'EDIT');
    this.data = new Bean();
    this.data.initializeByObject(this.bean);
    if (this.data.roaster !== '') {
      this.ignoreNextChange = true;
    }
    this.beanStars.setRating(this.data.roast_range);
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


  public addAnotherSort() {
    const beanInformation: IBeanInformation = {} as IBeanInformation;
    this.data.bean_information.push(beanInformation);
  }

  public deleteSortInformation(_index: number) {
    this.data.bean_information.splice(_index, 1);
  }

  public roasterSelected(selected: string) :void {
    this.data.roaster = selected;
    this.roasterResults = [];
    this.roasterResultsAvailable = false;
    this.ignoreNextChange = true;
  }

  public onRoastRate(_event): void {
    this.beanStars.setRating(this.data.roast_range);
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
