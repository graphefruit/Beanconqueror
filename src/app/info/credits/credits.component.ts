import {Component, OnInit} from '@angular/core';
import {UIHelper} from '../../../services/uiHelper';

@Component({
    selector: 'credits',
    templateUrl: './credits.component.html',
    styleUrls: ['./credits.component.scss'],
    standalone: false
})
export class CreditsComponent implements OnInit {

  public noCreditsToGive: boolean = true;
  public credits: any = {

  };

  constructor(private readonly uiHelper: UIHelper) {
  }

  public ngOnInit() {
  }




  public openLink(event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);

  }

}
