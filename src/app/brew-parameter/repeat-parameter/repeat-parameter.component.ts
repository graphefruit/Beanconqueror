import { Component, OnInit } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'app-repeat-parameter',
  templateUrl: './repeat-parameter.component.html',
  styleUrls: ['./repeat-parameter.component.scss'],
})
export class RepeatParameterComponent implements OnInit {
  public settings: Settings;

  constructor(public uiSettingsStorage: UISettingsStorage) {
    this.__initializeSettings();
  }

  public ngOnInit() {}

  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();
  }
}
