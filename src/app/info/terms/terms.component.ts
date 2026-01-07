import { Component, OnInit, inject } from '@angular/core';
import { UIHelper } from '../../../services/uiHelper';
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
  selector: 'terms',
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.scss'],
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
export class TermsComponent implements OnInit {
  private readonly uiHelper = inject(UIHelper);

  public ngOnInit() {}

  public openLink(event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);
  }
}
