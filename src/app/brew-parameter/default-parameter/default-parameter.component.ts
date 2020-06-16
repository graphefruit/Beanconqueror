import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {Settings} from '../../../classes/settings/settings';

@Component({
  selector: 'default-parameter',
  templateUrl: './default-parameter.component.html',
  styleUrls: ['./default-parameter.component.scss'],
})
export class DefaultParameterComponent implements OnInit {

  public settings: Settings;


  constructor(public uiSettingsStorage: UISettingsStorage,
              private readonly uiAnalytics: UIAnalytics,
              private readonly changeDetectorRef: ChangeDetectorRef) {

    this.__initializeSettings();
  }

  public ngOnInit() {
  }

  public saveSettings(): void {
    this.changeDetectorRef.detectChanges();
    this.uiSettingsStorage.saveSettings(this.settings);
  }

  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();
  }


}
