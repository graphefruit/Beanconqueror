import { Component, OnInit } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { IonicModule } from '@ionic/angular';
import { SortCustomParameterComponent } from '../../../components/parameter/sort-custom-parameter/sort-custom-parameter.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'sort-parameter',
  templateUrl: './sort-parameter.component.html',
  styleUrls: ['./sort-parameter.component.scss'],
  imports: [IonicModule, SortCustomParameterComponent, TranslatePipe],
})
export class SortParameterComponent implements OnInit {
  public settings: Settings;

  constructor(public uiSettingsStorage: UISettingsStorage) {
    this.__initializeSettings();
  }

  public ngOnInit() {}

  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();
  }
}
