import { Component, OnInit } from '@angular/core';
import { UIHelper } from '../../../services/uiHelper';
import { IonicModule } from '@ionic/angular';
import { TranslatePipe } from '@ngx-translate/core';
import { KeysPipe } from '../../../pipes/keys';

@Component({
  selector: 'credits',
  templateUrl: './credits.component.html',
  styleUrls: ['./credits.component.scss'],
  imports: [IonicModule, TranslatePipe, KeysPipe],
})
export class CreditsComponent implements OnInit {
  public noCreditsToGive: boolean = true;
  public credits: any = {};

  constructor(private readonly uiHelper: UIHelper) {}

  public ngOnInit() {}

  public openLink(event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);
  }
}
