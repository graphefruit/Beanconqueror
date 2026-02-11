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
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronDownOutline,
  chevronForwardOutline,
  chevronUpOutline,
} from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderComponent } from '../../../components/header/header.component';
import { KeysPipe } from '../../../pipes/keys';
import { UIHelper } from '../../../services/uiHelper';

@Component({
  selector: 'credits',
  templateUrl: './credits.component.html',
  styleUrls: ['./credits.component.scss'],
  imports: [
    TranslatePipe,
    KeysPipe,
    IonHeader,
    IonBackButton,
    IonContent,
    IonCard,
    IonCardHeader,
    IonItem,
    IonIcon,
    IonLabel,
    IonCardContent,
    HeaderComponent,
  ],
})
export class CreditsComponent implements OnInit {
  private readonly uiHelper = inject(UIHelper);

  public noCreditsToGive: boolean = true;
  public credits: any = {};

  constructor() {
    addIcons({ chevronForwardOutline, chevronDownOutline, chevronUpOutline });
  }

  public ngOnInit() {}

  public openLink(event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);
  }
}
