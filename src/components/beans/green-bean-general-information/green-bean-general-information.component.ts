import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import moment from 'moment';
import { TranslateService } from '@ngx-translate/core';

import { GreenBean } from '../../../classes/green-bean/green-bean';
import { Platform } from '@ionic/angular';
import { NgxStarsComponent } from 'ngx-stars';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

declare var cordova;
@Component({
  selector: 'green-bean-general-information',
  templateUrl: './green-bean-general-information.component.html',
  styleUrls: ['./green-bean-general-information.component.scss'],
})
export class GreenBeanGeneralInformationComponent implements OnInit {
  @Input() public data: GreenBean;
  @Output() public dataChange = new EventEmitter<GreenBean>();
  @ViewChild('beanRating', { read: NgxStarsComponent, static: false })
  public beanRating: NgxStarsComponent;
  public settings: Settings;

  constructor(
    private readonly platform: Platform,
    private readonly translate: TranslateService,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly uiSettings: UISettingsStorage
  ) {
    this.settings = this.uiSettings.getSettings();
  }

  public ngOnInit() {}
  public changedRating() {
    if (typeof this.beanRating !== 'undefined') {
      this.beanRating.setRating(this.data.rating);
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
            this.data.date = '';
          } else {
            this.data.date = moment(newDate).toISOString();
          }

          this.changeDetectorRef.detectChanges();
        },
        error: () => {},
      });
    }
  }
}
