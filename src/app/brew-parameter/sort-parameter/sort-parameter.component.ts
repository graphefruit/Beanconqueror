import { Component, inject, OnInit } from '@angular/core';

import {
  IonBackButton,
  IonContent,
  IonHeader,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Settings } from '../../../classes/settings/settings';
import { HeaderComponent } from '../../../components/header/header.component';
import { SortCustomParameterComponent } from '../../../components/parameter/sort-custom-parameter/sort-custom-parameter.component';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'sort-parameter',
  templateUrl: './sort-parameter.component.html',
  styleUrls: ['./sort-parameter.component.scss'],
  imports: [
    SortCustomParameterComponent,
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    HeaderComponent,
  ],
})
export class SortParameterComponent implements OnInit {
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
