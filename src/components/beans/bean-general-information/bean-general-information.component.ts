import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { Bean } from '../../../classes/bean/bean';
import moment from 'moment';
import { Platform } from '@ionic/angular/standalone';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { ROASTS_ENUM } from '../../../enums/beans/roasts';
import { BEAN_MIX_ENUM } from '../../../enums/beans/mix';
import { BEAN_ROASTING_TYPE_ENUM } from '../../../enums/beans/beanRoastingType';
import { NgxStarsComponent, NgxStarsModule } from 'ngx-stars';
import { IBeanInformation } from '../../../interfaces/bean/iBeanInformation';

import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIHelper } from '../../../services/uiHelper';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { BluetoothScale } from '../../../classes/devices';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { FormsModule } from '@angular/forms';
import { TransformDateDirective } from '../../../directive/transform-date';
import { PreventCharacterDirective } from '../../../directive/prevent-character.directive';
import { RemoveEmptyNumberDirective } from '../../../directive/remove-empty-number.directive';
import { PhotoAddComponent } from '../../photo-add/photo-add.component';
import { KeysPipe } from '../../../pipes/keys';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { BeanFieldVisiblePipe } from '../../../pipes/bean/beanFieldVisible';
import {
  IonCard,
  IonItem,
  IonInput,
  IonList,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonRange,
  IonButton,
  IonIcon,
  IonCheckbox,
  IonTextarea,
} from '@ionic/angular/standalone';

declare var cordova;
@Component({
  selector: 'bean-general-information',
  templateUrl: './bean-general-information.component.html',
  styleUrls: ['./bean-general-information.component.scss'],
  imports: [
    FormsModule,
    TransformDateDirective,
    NgxStarsModule,
    PreventCharacterDirective,
    RemoveEmptyNumberDirective,
    PhotoAddComponent,
    TranslatePipe,
    KeysPipe,
    ToFixedPipe,
    BeanFieldVisiblePipe,
    IonCard,
    IonItem,
    IonInput,
    IonList,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonBadge,
    IonRange,
    IonButton,
    IonIcon,
    IonCheckbox,
    IonTextarea,
  ],
})
export class BeanGeneralInformationComponent implements OnInit {
  private readonly platform = inject(Platform);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly translate = inject(TranslateService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly bleManager = inject(CoffeeBluetoothDevicesService);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  readonly uiHelper = inject(UIHelper);
  readonly uiBeanHelper = inject(UIBeanHelper);

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

  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public pinFormatter(value: any) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return `${0}`;
    }
    const newValue = +parsedFloat.toFixed(2);
    return `${newValue}`;
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
    if (!this.platform.is('capacitor')) {
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
      new Set(this.roasterResults.map((e) => e)),
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

  public chooseDate(_event, _keyIdentifier) {
    _event.target.blur();
    _event.cancelBubble = true;
    _event.preventDefault();
    _event.stopImmediatePropagation();
    _event.stopPropagation();

    if (this.platform.is('capacitor')) {
      const myDate = new Date(); // From model.

      cordova.plugins.DateTimePicker.show({
        mode: 'date',
        date: myDate,
        okText: this.translate.instant('CHOOSE'),
        todayText: this.translate.instant('TODAY'),
        cancelText: this.translate.instant('CANCEL'),
        clearText: this.translate.instant('DELETE'),
        success: (newDate) => {
          if (newDate === undefined) {
            this.data[_keyIdentifier] = '';
          } else {
            this.data[_keyIdentifier] = moment(newDate).toISOString();
          }

          this.changeDetectorRef.detectChanges();
        },
        error: () => {},
      });
    } else {
      this.data[_keyIdentifier] = moment(new Date()).toISOString();
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
