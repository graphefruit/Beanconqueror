import { Component, inject, OnInit } from '@angular/core';

import {
  IonBackButton,
  IonCard,
  IonContent,
  IonHeader,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderComponent } from '../../../components/header/header.component';
import { UIHelper } from '../../../services/uiHelper';

@Component({
  selector: 'terms',
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.scss'],
  imports: [
    TranslatePipe,
    IonHeader,
    IonBackButton,
    IonContent,
    IonCard,
    HeaderComponent,
  ],
})
export class TermsComponent implements OnInit {
  private readonly uiHelper = inject(UIHelper);

  public ngOnInit() {}

  public openLink(event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);
  }
}
