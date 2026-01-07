import { Component, OnInit, inject } from '@angular/core';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { ManageCustomParameterComponent } from '../../../components/parameter/manage-custom-parameter/manage-custom-parameter.component';
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
  selector: 'manage-parameter',
  templateUrl: './manage-parameter.component.html',
  styleUrls: ['./manage-parameter.component.scss'],
  imports: [
    ManageCustomParameterComponent,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
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
