import {Component, OnInit} from '@angular/core';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {Settings} from '../../../classes/settings/settings';

@Component({
  selector: 'manage-parameter',
  templateUrl: './manage-parameter.component.html',
  styleUrls: ['./manage-parameter.component.scss'],
})
export class ManageParameterComponent implements OnInit {

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
