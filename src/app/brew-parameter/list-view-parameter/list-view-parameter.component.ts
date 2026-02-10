import { Component, inject, OnInit } from '@angular/core';

import {
  IonBackButton,
  IonContent,
  IonHeader,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Settings } from '../../../classes/settings/settings';
import { HeaderComponent } from '../../../components/header/header.component';
import { ListViewCustomParameterComponent } from '../../../components/parameter/list-view-custom-parameter/list-view-custom-parameter.component';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'list-view-parameter',
  templateUrl: './list-view-parameter.component.html',
  styleUrls: ['./list-view-parameter.component.scss'],
  imports: [
    ListViewCustomParameterComponent,
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    HeaderComponent,
  ],
})
export class ListViewParameterComponent implements OnInit {
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
