import {
  ChangeDetectionStrategy,
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
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';
import moment from 'moment';

import { Bean } from '../../../classes/bean/bean';
import { GreenBean } from '../../../classes/green-bean/green-bean';
import { Settings } from '../../../classes/settings/settings';
import { PickerFieldDirective } from '../../../directive/picker-field.directive';
import { SelectLabelDirective } from '../../../directive/select-label.directive';
import { TransformDateDirective } from '../../../directive/transform-date';
import { BEAN_FREEZING_STORAGE_ENUM } from '../../../enums/beans/beanFreezingStorage';
import { KeysPipe } from '../../../pipes/keys';
import {
  pickedDateValue,
  VALUE_PICKER_PORT,
} from '../../../services/ports/value-picker-port';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'bean-freeze-information',
  templateUrl: './bean-freeze-information.component.html',
  styleUrls: ['./bean-freeze-information.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TransformDateDirective,
    FormsModule,
    TranslatePipe,
    KeysPipe,
    IonCard,
    IonItem,
    IonInput,
    PickerFieldDirective,
    IonSelect,
    SelectLabelDirective,
    IonSelectOption,
    IonLabel,
    IonTextarea,
  ],
})
export class BeanFreezeInformationComponent implements OnInit {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly platform = inject(Platform);
  private readonly valuePicker = inject(VALUE_PICKER_PORT);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  @Input() public data: Bean;
  @Output() public dataChange = new EventEmitter<Bean>();
  public settings: Settings = undefined;
  public readonly beanFreezingStorageEnum = BEAN_FREEZING_STORAGE_ENUM;

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public async chooseDate(_event, _type: string) {
    _event.target.blur();
    _event.cancelBubble = true;
    _event.preventDefault();
    _event.stopImmediatePropagation();
    _event.stopPropagation();

    if (this.platform.is('capacitor')) {
      const value = pickedDateValue(
        await this.valuePicker.pickDate(new Date()),
      );
      if (value === undefined) {
        return;
      }
      if (_type === 'freeze') {
        this.data.frozenDate = value;
      } else if (_type === 'unfreeze') {
        this.data.unfrozenDate = value;
      }
      this.changeDetectorRef.detectChanges();
    } else {
      if (_type === 'freeze') {
        this.data.frozenDate = moment(new Date()).toISOString();
      } else if (_type === 'unfreeze') {
        this.data.unfrozenDate = moment(new Date()).toISOString();
      }
    }
  }
}
