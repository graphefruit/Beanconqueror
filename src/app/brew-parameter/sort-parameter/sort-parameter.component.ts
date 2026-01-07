import { Component, OnInit, inject } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { SortCustomParameterComponent } from '../../../components/parameter/sort-custom-parameter/sort-custom-parameter.component';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
} from '@ionic/angular/standalone';

@Component({
  selector: 'sort-parameter',
  templateUrl: './sort-parameter.component.html',
  styleUrls: ['./sort-parameter.component.scss'],
  imports: [
    SortCustomParameterComponent,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
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
