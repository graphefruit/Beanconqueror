import { Component, OnInit, inject } from '@angular/core';
import { UIHelper } from '../../../services/uiHelper';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonBackButton,
  IonContent,
  IonCard,
} from '@ionic/angular/standalone';
import { HeaderComponent } from '../../../components/header/header.component';

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
