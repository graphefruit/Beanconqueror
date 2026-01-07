import { Component, OnInit } from '@angular/core';
import { UIHelper } from '../../../services/uiHelper';
import LINK_TRACKING from '../../../data/tracking/linkTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, logoGithub } from 'ionicons/icons';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonItem,
  IonIcon,
} from '@ionic/angular/standalone';

@Component({
  selector: 'contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonItem,
    IonIcon,
  ],
})
export class ContactComponent implements OnInit {
  constructor(
    private readonly uiHelper: UIHelper,
    private readonly uiAnalytics: UIAnalytics,
  ) {
    addIcons({ chevronForwardOutline, logoGithub });
  }

  public ngOnInit() {}

  public openGithub() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.GITHUB,
    );
    this.uiHelper.openExternalWebpage(
      'https://github.com/graphefruit/Beanconqueror',
    );
  }
  public openWebsite() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.WEBSITE,
    );
    this.uiHelper.openExternalWebpage('https://beanconqueror.com');
  }
}
