import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { Bean } from '../../../classes/bean/bean';
import { GreenBean } from '../../../classes/green-bean/green-bean';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import moment from 'moment';
import { Platform } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { BEAN_FREEZING_STORAGE_ENUM } from '../../../enums/beans/beanFreezingStorage';

declare var cordova;
@Component({
    selector: 'bean-freeze-information',
    templateUrl: './bean-freeze-information.component.html',
    styleUrls: ['./bean-freeze-information.component.scss'],
    standalone: false
})
export class BeanFreezeInformationComponent implements OnInit {
  @Input() public data: Bean;
  @Output() public dataChange = new EventEmitter<Bean>();
  public settings: Settings = undefined;
  public readonly beanFreezingStorageEnum = BEAN_FREEZING_STORAGE_ENUM;
  constructor(
    private readonly uiSettingsStorage: UISettingsStorage,
    public readonly uiBeanHelper: UIBeanHelper,
    private readonly platform: Platform,
    private readonly translate: TranslateService,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

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
        clearText: this.translate.instant('CLEAR'),
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
