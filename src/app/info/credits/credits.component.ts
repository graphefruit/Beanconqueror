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
    'bean-background': {
      TITLE: 'Bean background',
      LINK: 'https://www.pexels.com/de-de/@igor-haritanovich-814387?utm_content=attributionCopyText&utm_medium=referral&utm_source=pexels',
      DESCRIPTION: `https://www.pexels.com/de-de/foto/arabica-aromatisch-bohnen-braun-1695052/?utm_content=attributionCopyText&utm_medium=referral&utm_source=pexels`
    }
  };

  // tslint:enable



  public openLink(event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);

  }

}
