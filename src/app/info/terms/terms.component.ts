import { Component, OnInit } from '@angular/core';
import { UIHelper } from '../../../services/uiHelper';
import { IonicModule } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'terms',
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.scss'],
  imports: [IonicModule, TranslatePipe],
})
export class TermsComponent implements OnInit {
  constructor(private readonly uiHelper: UIHelper) {}

  public ngOnInit() {}

  public openLink(event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);
  }
}
