import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Bean } from '../../../classes/bean/bean';
import moment from 'moment';
import { Platform } from '@ionic/angular';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { TranslateService } from '@ngx-translate/core';
import { ROASTS_ENUM } from '../../../enums/beans/roasts';
import { BEAN_MIX_ENUM } from '../../../enums/beans/mix';
import { BEAN_ROASTING_TYPE_ENUM } from '../../../enums/beans/beanRoastingType';
import { NgxStarsComponent } from 'ngx-stars';
import { IBeanInformation } from '../../../interfaces/bean/iBeanInformation';

import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIHelper } from '../../../services/uiHelper';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { BluetoothScale } from '../../../classes/devices';
import { UIBeanHelper } from '../../../services/uiBeanHelper';

declare var cordova;
@Component({
  selector: 'bean-general-information',
  templateUrl: './bean-general-information.component.html',
  styleUrls: ['./bean-general-information.component.scss'],
})
export class BeanGeneralInformationComponent implements OnInit {
  @Input() public data: Bean;
  public initialBeanData: Bean;
  @Output() public dataChange = new EventEmitter<Bean>();
  @ViewChild('beanStars', { read: NgxStarsComponent, static: false })
  public beanStars: NgxStarsComponent;
  @ViewChild('beanRating', { read: NgxStarsComponent, static: false })
  public beanRating: NgxStarsComponent;

  public roastsEnum = ROASTS_ENUM;
  public mixEnum = BEAN_MIX_ENUM;
  public beanRoastingTypeEnum = BEAN_ROASTING_TYPE_ENUM;

  public roasterResultsAvailable: boolean = false;
  public roasterResults: string[] = [];
  public roasterFocused: boolean = false;

  public maxBeanRating: number = 5;
  public settings: Settings = undefined;

  constructor(
    private readonly platform: Platform,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly translate: TranslateService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly uiSettingsStorage: UISettingsStorage,
    public readonly uiHelper: UIHelper,
    public readonly uiBeanHelper: UIBeanHelper
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ngOnInit() {
    this.maxBeanRating = this.settings.bean_rating;
    this.initialBeanData = this.uiHelper.cloneData(this.data);
    setTimeout(() => {
      if (this.beanStars && this.beanStars.setRating) {
        this.beanStars.setRating(this.data.roast_range);
      }
    }, 1000);
  }

  public smartScaleConnected() {
    if (!this.platform.is('cordova')) {
      return true;
    }

    const scale: BluetoothScale = this.bleManager.getScale();
    return !!scale;
  }

  public bluetoothScaleSetBeanWeight() {
    this.data.weight = this.bleManager.getScaleWeight();
  }

  public onRoasterSearchChange(event: any) {
    if (!this.roasterFocused) {
      return;
    }
    let actualSearchValue = event.target.value;
    this.roasterResults = [];
    this.roasterResultsAvailable = false;
    if (actualSearchValue === undefined || actualSearchValue === '') {
      return;
    }

    actualSearchValue = actualSearchValue.toLowerCase();
    const filteredEntries = this.uiBeanStorage
      .getAllEntries()
      .filter((e) => e.roaster.toLowerCase().includes(actualSearchValue));

    for (const entry of filteredEntries) {
      this.roasterResults.push(entry.roaster);
    }
    // Distinct values
    this.roasterResults = Array.from(
      new Set(this.roasterResults.map((e) => e))
    );

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
      this.roasterFocused = false;
    }, 150);
  }
  public onRoasterSearchFocus($event) {
    this.roasterFocused = true;
  }

  public roasterSelected(selected: string): void {
    this.data.roaster = selected;
    this.roasterResults = [];
    this.roasterResultsAvailable = false;
    this.roasterFocused = false;
  }

  public chooseBuyDate(_event) {
    _event.target.blur();
    _event.cancelBubble = true;
    _event.preventDefault();
    _event.stopImmediatePropagation();
    _event.stopPropagation();

    if (this.platform.is('cordova')) {
      const myDate = new Date(); // From model.

      cordova.plugins.DateTimePicker.show({
        mode: 'date',
        date: myDate,
        okText: this.translate.instant('CHOOSE'),
        todayText: this.translate.instant('TODAY'),
        cancelText: this.translate.instant('CANCEL'),
        clearText: this.translate.instant('CLEAR'),
        success: (newDate) => {
          if (newDate === undefined) {
            this.data.buyDate = '';
          } else {
            this.data.buyDate = moment(newDate).toISOString();
          }

          this.changeDetectorRef.detectChanges();
        },
        error: () => {},
      });
    }
  }

  public chooseDate(_event) {
    _event.target.blur();
    _event.cancelBubble = true;
    _event.preventDefault();
    _event.stopImmediatePropagation();
    _event.stopPropagation();

    if (this.platform.is('cordova')) {
      const myDate = new Date(); // From model.

      cordova.plugins.DateTimePicker.show({
        mode: 'date',
        date: myDate,
        okText: this.translate.instant('CHOOSE'),
        todayText: this.translate.instant('TODAY'),
        cancelText: this.translate.instant('CANCEL'),
        clearText: this.translate.instant('CLEAR'),
        success: (newDate) => {
          if (newDate === undefined) {
            this.data.roastingDate = '';
          } else {
            this.data.roastingDate = moment(newDate).toISOString();
          }

          this.changeDetectorRef.detectChanges();
        },
        error: () => {},
      });
    }
  }

  public changedRating() {
    if (typeof this.beanRating !== 'undefined') {
      this.beanRating.setRating(this.data.rating);
    }
  }
  public onRoastRate(_event): void {
    this.beanStars.setRating(this.data.roast_range);
  }
  public beanMixChanged() {
    if (this.data.beanMix !== BEAN_MIX_ENUM.BLEND) {
      const beanInfo: IBeanInformation = this.data.bean_information[0];
      this.data.bean_information = [];
      this.data.bean_information.push(beanInfo);
    }
  }
}
