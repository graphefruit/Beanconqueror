import { Component, inject, OnInit } from '@angular/core';

import {
  IonBackButton,
  IonCard,
  IonContent,
  IonHeader,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Settings } from '../../../classes/settings/settings';
import { HeaderComponent } from '../../../components/header/header.component';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'privacy',
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    IonCard,
    HeaderComponent,
  ],
})
export class PrivacyComponent implements OnInit {
  private readonly uiHelper = inject(UIHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiAnalytics = inject(UIAnalytics);

  public ngOnInit() {}

  public openLink(event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);
  }
  public disableTracking() {}
}
