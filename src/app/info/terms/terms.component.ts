import { Component, OnInit } from '@angular/core';
import {UIHelper} from '../../../services/uiHelper';

@Component({
    selector: 'terms',
    templateUrl: './terms.component.html',
    styleUrls: ['./terms.component.scss'],
    standalone: false
})
export class TermsComponent implements OnInit {

  constructor(private readonly uiHelper: UIHelper) { }

  public ngOnInit() {}

  public openLink (event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);

  }

}
