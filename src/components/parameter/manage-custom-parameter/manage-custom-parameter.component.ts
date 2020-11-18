import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {Settings} from '../../../classes/settings/settings';
import {Subject} from 'rxjs';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';

@Component({
  selector: 'manage-custom-parameter',
  templateUrl: './manage-custom-parameter.component.html',
  styleUrls: ['./manage-custom-parameter.component.scss'],
})
export class ManageCustomParameterComponent implements OnInit {


  public settings: Settings;
  public debounceSettingsChanged: Subject<string> = new Subject<string>();

  constructor(public uiSettingsStorage: UISettingsStorage,
              private readonly uiAnalytics: UIAnalytics,
              private readonly changeDetectorRef: ChangeDetectorRef) {
    this.debounceSettingsChanged
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(() => {
        this.saveSettings();
      });
    this.__initializeSettings();
  }

  public ngOnInit() {
  }

  public settingsChanged(_query): void {
    this.debounceSettingsChanged.next(_query);
  }

  public saveSettings(): void {
    this.changeDetectorRef.detectChanges();
    this.uiSettingsStorage.saveSettings(this.settings);
  }

  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();
  }

}
