import { Component, OnInit, inject } from '@angular/core';
import { UIHelper } from '../../../services/uiHelper';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonCard,
} from '@ionic/angular/standalone';

@Component({
  selector: 'privacy',
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonCard,
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
