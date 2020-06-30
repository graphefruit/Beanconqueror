import {Component, OnInit} from '@angular/core';
import {UIHelper} from '../../../services/uiHelper';

@Component({
  selector: 'credits',
  templateUrl: './credits.component.html',
  styleUrls: ['./credits.component.scss'],
})
export class CreditsComponent implements OnInit {

  constructor (private readonly uiHelper: UIHelper) {
  }

  public ngOnInit() {}
  public credits: any = {
    'icon-loading': {
      TITLE: 'Loading Coffee',
      LINK: 'https://icons8.com/preloaders',
      DESCRIPTION: `https://icons8.com/preloaders/en/terms_of_use`
    }
  };

  // tslint:enable



  public openLink(event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);

  }

}
