import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonBadge,
  IonButton,
  IonCard,
  IonCheckbox,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  Platform,
} from '@ionic/angular';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { NgxStarsComponent, NgxStarsModule } from 'ngx-stars';

import { Bean } from '../../../classes/bean/bean';
import { BluetoothScale } from '../../../classes/devices';
import { Settings } from '../../../classes/settings/settings';
import { PickerFieldDirective } from '../../../directive/picker-field.directive';
import { PreventCharacterDirective } from '../../../directive/prevent-character.directive';
import { RangeNameDirective } from '../../../directive/range-name.directive';
import { RemoveEmptyNumberDirective } from '../../../directive/remove-empty-number.directive';
import { SelectLabelDirective } from '../../../directive/select-label.directive';
import { StarsNameDirective } from '../../../directive/stars-name.directive';
import { TransformDateDirective } from '../../../directive/transform-date';
import { BEAN_ROASTING_TYPE_ENUM } from '../../../enums/beans/beanRoastingType';
import { BEAN_MIX_ENUM } from '../../../enums/beans/mix';
import { ROASTS_ENUM } from '../../../enums/beans/roasts';
import { IBeanInformation } from '../../../interfaces/bean/iBeanInformation';
import { BeanFieldVisiblePipe } from '../../../pipes/bean/beanFieldVisible';
import { KeysPipe } from '../../../pipes/keys';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { CoffeeBluetoothDevicesService } from '../../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { PhotoAddComponent } from '../../photo-add/photo-add.component';
import { SuggestionListComponent } from '../../suggestion-list/suggestion-list.component';

declare var cordova;
@Component({
  selector: 'bean-general-information',
  templateUrl: './bean-general-information.component.html',
  styleUrls: ['./bean-general-information.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    TransformDateDirective,
    NgxStarsModule,
    StarsNameDirective,
    PreventCharacterDirective,
    RemoveEmptyNumberDirective,
    PhotoAddComponent,
    SuggestionListComponent,
    TranslatePipe,
    KeysPipe,
    ToFixedPipe,
    BeanFieldVisiblePipe,
    IonCard,
    IonItem,
    IonInput,
    PickerFieldDirective,
    IonLabel,
    IonSelect,
    SelectLabelDirective,
    IonSelectOption,
    IonBadge,
    IonRange,
    RangeNameDirective,
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

  /** The roasters of all stored beans. */
  public readonly storedRoasters = (): string[] =>
    this.uiBeanStorage
      .getAllEntries()
      .map((bean) => bean.roaster)
      .filter((roaster) => typeof roaster === 'string');

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
    // The field stores the key of the mix ('BLEND'); a bean saved with the
    // name of the mix ('Blend') keeps its varieties as before.
    const isBlend =
      BEAN_MIX_ENUM[this.data.beanMix] === BEAN_MIX_ENUM.BLEND ||
      this.data.beanMix === BEAN_MIX_ENUM.BLEND;
    if (!isBlend) {
      const beanInfo: IBeanInformation = this.data.bean_information[0];
      this.data.bean_information = [];
      this.data.bean_information.push(beanInfo);
    }
  }
}
