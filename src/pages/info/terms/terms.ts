/** Core */
import {Component} from '@angular/core';
/** Services */
import {UIHelper} from '../../../services/uiHelper';
@Component({
  templateUrl: 'terms.html',
})
export class TermsPage {

  constructor(private uiHelper:UIHelper) {
  }

  public openLink(event, _link: string) {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);

  }
}

