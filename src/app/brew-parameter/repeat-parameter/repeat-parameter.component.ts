import { Component, OnInit, inject } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { RepeatCustomParameterComponent } from '../../../components/parameter/repeat-custom-parameter/repeat-custom-parameter.component';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonBackButton,
  IonContent,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../../../components/header/header.component';

@Component({
  selector: 'app-repeat-parameter',
  templateUrl: './repeat-parameter.component.html',
  styleUrls: ['./repeat-parameter.component.scss'],
  imports: [
    RepeatCustomParameterComponent,
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    HeaderComponent,
  ],
})
export class RepeatParameterComponent implements OnInit {
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
