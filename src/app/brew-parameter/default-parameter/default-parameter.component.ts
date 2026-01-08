import { Component, OnInit, inject } from '@angular/core';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { DefaultCustomParameterComponent } from '../../../components/parameter/default-custom-parameter/default-custom-parameter.component';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonBackButton,
  IonContent,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../../../components/header/header.component';

@Component({
  selector: 'default-parameter',
  templateUrl: './default-parameter.component.html',
  styleUrls: ['./default-parameter.component.scss'],
  imports: [
    DefaultCustomParameterComponent,
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    HeaderComponent,
  ],
})
export class DefaultParameterComponent implements OnInit {
  uiSettingsStorage = inject(UISettingsStorage);

  public settings: Settings;

  constructor() {
    this.__initializeSettings();
  }

  public ngOnInit() {}

  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();
  }
}
