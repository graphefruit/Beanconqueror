import {Component, OnInit} from '@angular/core';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {Settings} from '../../../classes/settings/settings';

@Component({
  selector: 'splunk-logging-parameter',
  templateUrl: './splunk-logging-parameter.component.html',
  styleUrls: ['./splunk-logging-parameter.component.scss'],
})
export class SplunkLoggingParameterComponent implements OnInit {

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
