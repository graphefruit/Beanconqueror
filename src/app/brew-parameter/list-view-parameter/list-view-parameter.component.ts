import { Component, OnInit } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { IonicModule } from '@ionic/angular';
import { ListViewCustomParameterComponent } from '../../../components/parameter/list-view-custom-parameter/list-view-custom-parameter.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'list-view-parameter',
  templateUrl: './list-view-parameter.component.html',
  styleUrls: ['./list-view-parameter.component.scss'],
  imports: [IonicModule, ListViewCustomParameterComponent, TranslatePipe],
})
export class ListViewParameterComponent implements OnInit {
  public settings: Settings;

  constructor(public uiSettingsStorage: UISettingsStorage) {
    this.__initializeSettings();
  }

  public ngOnInit() {}

  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();
  }
}
