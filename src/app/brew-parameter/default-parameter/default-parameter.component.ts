import { Component, OnInit } from '@angular/core';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { IonicModule } from '@ionic/angular';
import { DefaultCustomParameterComponent } from '../../../components/parameter/default-custom-parameter/default-custom-parameter.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'default-parameter',
  templateUrl: './default-parameter.component.html',
  styleUrls: ['./default-parameter.component.scss'],
  imports: [IonicModule, DefaultCustomParameterComponent, TranslatePipe],
})
export class DefaultParameterComponent implements OnInit {
  public settings: Settings;

  constructor(public uiSettingsStorage: UISettingsStorage) {
    this.__initializeSettings();
  }

  public ngOnInit() {}

  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();
  }
}
