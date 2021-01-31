import {ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import moment from 'moment';
import {TranslateService} from '@ngx-translate/core';

import {GreenBean} from '../../../classes/green-bean/green-bean';
import {Platform} from '@ionic/angular';

declare var cordova;
@Component({
  selector: 'green-bean-general-information',
  templateUrl: './green-bean-general-information.component.html',
  styleUrls: ['./green-bean-general-information.component.scss'],
})
export class GreenBeanGeneralInformationComponent implements OnInit {

  @Input() public data: GreenBean ;
  @Output() public dataChange = new EventEmitter<GreenBean>();

  constructor(private readonly platform: Platform,
              private readonly translate: TranslateService,
              private readonly changeDetectorRef: ChangeDetectorRef
             ) {

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
          this.data.date = moment(newDate).toISOString();
          this.changeDetectorRef.detectChanges();
        }, error: () => {

        }
      });

    }
  }

}
