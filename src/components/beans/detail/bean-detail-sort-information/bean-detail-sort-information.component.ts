import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
} from '@angular/core';

import { IonCard, IonItem, IonLabel } from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Bean } from '../../../../classes/bean/bean';
import { GreenBean } from '../../../../classes/green-bean/green-bean';
import { Settings } from '../../../../classes/settings/settings';
import { BEAN_FUNCTION_PIPE_ENUM } from '../../../../enums/beans/beanFunctionPipe';
import { BeanFunction } from '../../../../pipes/bean/beanFunction';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';

@Component({
  selector: 'bean-detail-sort-information',
  templateUrl: './bean-detail-sort-information.component.html',
  styleUrls: ['./bean-detail-sort-information.component.scss'],
  imports: [TranslatePipe, BeanFunction, IonCard, IonItem, IonLabel],
})
export class BeanDetailSortInformationComponent implements OnInit {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  readonly uiBeanHelper = inject(UIBeanHelper);

  @Input() public data: GreenBean | Bean;
  @Output() public dataChange = new EventEmitter<GreenBean | Bean>();

  public settings: Settings;
  public BEAN_FUNCTION_PIPE_ENUM = BEAN_FUNCTION_PIPE_ENUM;

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
  }
}
