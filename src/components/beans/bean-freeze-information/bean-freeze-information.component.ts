import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonCard,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  Platform,
} from '@ionic/angular/standalone';

import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import moment from 'moment';

import { Bean } from '../../../classes/bean/bean';
import { GreenBean } from '../../../classes/green-bean/green-bean';
import { Settings } from '../../../classes/settings/settings';
import { TransformDateDirective } from '../../../directive/transform-date';
import { BEAN_FREEZING_STORAGE_ENUM } from '../../../enums/beans/beanFreezingStorage';
import { KeysPipe } from '../../../pipes/keys';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

declare var cordova;
@Component({
  selector: 'bean-freeze-information',
  templateUrl: './bean-freeze-information.component.html',
  styleUrls: ['./bean-freeze-information.component.scss'],
  imports: [
    TransformDateDirective,
    FormsModule,
    TranslatePipe,
    KeysPipe,
    IonCard,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonLabel,
    IonTextarea,
  ],
})
export class BeanFreezeInformationComponent implements OnInit {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly platform = inject(Platform);
  private readonly translate = inject(TranslateService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  @Input() public data: Bean;
  @Output() public dataChange = new EventEmitter<Bean>();
  public settings: Settings = undefined;
  public readonly beanFreezingStorageEnum = BEAN_FREEZING_STORAGE_ENUM;

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public chooseDate(_event, _type: string) {
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
          let choosenDate;
          if (newDate === undefined) {
            choosenDate = '';
          } else {
            choosenDate = moment(newDate).toISOString();
          }

          if (_type === 'freeze') {
            this.data.frozenDate = choosenDate;
          } else if (_type === 'unfreeze') {
            this.data.unfrozenDate = choosenDate;
          }

          this.changeDetectorRef.detectChanges();
        },
        error: () => {},
      });
    } else {
      if (_type === 'freeze') {
        this.data.frozenDate = moment(new Date()).toISOString();
      } else if (_type === 'unfreeze') {
        this.data.unfrozenDate = moment(new Date()).toISOString();
      }
    }
  }
}
