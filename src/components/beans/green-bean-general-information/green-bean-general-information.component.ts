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
import moment from 'moment';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';

import { GreenBean } from '../../../classes/green-bean/green-bean';
import { Platform } from '@ionic/angular/standalone';
import { NgxStarsComponent, NgxStarsModule } from 'ngx-stars';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { FormsModule } from '@angular/forms';
import { TransformDateDirective } from '../../../directive/transform-date';
import { PreventCharacterDirective } from '../../../directive/prevent-character.directive';
import { RemoveEmptyNumberDirective } from '../../../directive/remove-empty-number.directive';
import { PhotoAddComponent } from '../../photo-add/photo-add.component';
import {
  IonCard,
  IonItem,
  IonInput,
  IonLabel,
  IonBadge,
  IonRange,
  IonCheckbox,
  IonTextarea,
} from '@ionic/angular/standalone';

declare var cordova;
@Component({
  selector: 'green-bean-general-information',
  templateUrl: './green-bean-general-information.component.html',
  styleUrls: ['./green-bean-general-information.component.scss'],
  imports: [
    FormsModule,
    TransformDateDirective,
    NgxStarsModule,
    PreventCharacterDirective,
    RemoveEmptyNumberDirective,
    PhotoAddComponent,
    TranslatePipe,
    IonCard,
    IonItem,
    IonInput,
    IonLabel,
    IonBadge,
    IonRange,
    IonCheckbox,
    IonTextarea,
  ],
})
export class GreenBeanGeneralInformationComponent implements OnInit {
  private readonly platform = inject(Platform);
  private readonly translate = inject(TranslateService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly uiSettings = inject(UISettingsStorage);

  @Input() public data: GreenBean;
  @Output() public dataChange = new EventEmitter<GreenBean>();
  @ViewChild('beanRating', { read: NgxStarsComponent, static: false })
  public beanRating: NgxStarsComponent;
  public settings: Settings;

  constructor() {
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
