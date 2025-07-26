import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { GreenBean } from '../../../../classes/green-bean/green-bean';
import { Bean } from '../../../../classes/bean/bean';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { Settings } from '../../../../classes/settings/settings';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';

@Component({
  selector: 'bean-detail-sort-information',
  templateUrl: './bean-detail-sort-information.component.html',
  styleUrls: ['./bean-detail-sort-information.component.scss'],
  standalone: false,
})
export class BeanDetailSortInformationComponent implements OnInit {
  @Input() public data: GreenBean | Bean;
  @Output() public dataChange = new EventEmitter<GreenBean | Bean>();

  public settings: Settings;

  constructor(
    private readonly uiSettingsStorage: UISettingsStorage,
    public readonly uiBeanHelper: UIBeanHelper,
  ) {}

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
  }
}
