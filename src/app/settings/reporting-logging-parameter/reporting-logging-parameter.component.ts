import {Component, OnInit} from '@angular/core';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {Settings} from '../../../classes/settings/settings';

@Component({
  selector: 'reporting-logging-parameter',
  templateUrl: './reporting-logging-parameter.component.html',
  styleUrls: ['./reporting-logging-parameter.component.scss'],
})
export class ReportingLoggingParameterComponent implements OnInit {

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
