import {Component, OnInit} from '@angular/core';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {Settings} from '../../../classes/settings/settings';

@Component({
  selector: 'default-parameter',
  templateUrl: './default-parameter.component.html',
  styleUrls: ['./default-parameter.component.scss'],
})
export class DefaultParameterComponent implements OnInit {

  public settings: Settings;


  constructor(public uiSettingsStorage: UISettingsStorage) {

    this.__initializeSettings();
  }

  public ngOnInit() {
  }


  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();
  }


}
