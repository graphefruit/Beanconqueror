import { Component, OnInit } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { IonicModule } from '@ionic/angular';
import { RepeatCustomParameterComponent } from '../../../components/parameter/repeat-custom-parameter/repeat-custom-parameter.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-repeat-parameter',
  templateUrl: './repeat-parameter.component.html',
  styleUrls: ['./repeat-parameter.component.scss'],
  imports: [IonicModule, RepeatCustomParameterComponent, TranslatePipe],
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
