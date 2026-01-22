import {
  Directive,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
} from '@angular/core';

import { Platform } from '@ionic/angular/standalone';

import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';

declare var cordova;
@Directive({ selector: '[choose-date-overlay]' })
export class ChooseDateOverlayDirective {
  private readonly platform = inject(Platform);
  private readonly translate = inject(TranslateService);

  @Input('data') public data: string;
  @Output() public dataChange = new EventEmitter<any>();

  @HostListener('click', ['$event', '$event.target'])
  public async click(_event, _target) {
    _event.target.blur();
    _event.cancelBubble = true;
    _event.preventDefault();
    _event.stopImmediatePropagation();
    _event.stopPropagation();

    this.chooseDate();
  }
  public chooseDate() {
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
            this.data = '';
          } else {
            this.data = moment(newDate).toISOString();
          }
          this.dataChange.emit(this.data);
        },
        error: () => {},
      });
    } else {
      this.data = moment(new Date()).subtract('day', 1).toISOString();
      this.dataChange.emit(this.data);
    }
  }
}
