import { Component, inject, OnInit } from '@angular/core';

import {
  IonBackButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, logoGithub } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderComponent } from '../../../components/header/header.component';
import LINK_TRACKING from '../../../data/tracking/linkTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIHelper } from '../../../services/uiHelper';

@Component({
  selector: 'contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonItem,
    IonIcon,
    HeaderComponent,
  ],
})
export class ContactComponent implements OnInit {
  private readonly uiHelper = inject(UIHelper);
  private readonly uiAnalytics = inject(UIAnalytics);

  constructor() {
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
