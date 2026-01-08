import { Component, OnInit, inject } from '@angular/core';
import { UIHelper } from '../../../services/uiHelper';
import { TranslatePipe } from '@ngx-translate/core';
import { KeysPipe } from '../../../pipes/keys';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline,
  chevronDownOutline,
  chevronUpOutline,
} from 'ionicons/icons';
import {
  IonHeader,
  IonBackButton,
  IonContent,
  IonCard,
  IonCardHeader,
  IonItem,
  IonIcon,
  IonLabel,
  IonCardContent,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../../../components/header/header.component';

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
