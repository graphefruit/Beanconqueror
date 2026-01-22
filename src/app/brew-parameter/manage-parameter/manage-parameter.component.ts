import { Component, inject, OnInit } from '@angular/core';

import {
  IonBackButton,
  IonContent,
  IonHeader,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Settings } from '../../../classes/settings/settings';
import { HeaderComponent } from '../../../components/header/header.component';
import { ManageCustomParameterComponent } from '../../../components/parameter/manage-custom-parameter/manage-custom-parameter.component';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'manage-parameter',
  templateUrl: './manage-parameter.component.html',
  styleUrls: ['./manage-parameter.component.scss'],
  imports: [
    ManageCustomParameterComponent,
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    HeaderComponent,
  ],
})
export class ManageParameterComponent implements OnInit {
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
