import { Component, OnInit } from '@angular/core';
import {UIHelper} from '../../../services/uiHelper';

@Component({
  selector: 'privacy',
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.scss'],
})
export class PrivacyComponent implements OnInit {

  constructor(private readonly uiHelper: UIHelper) { }

  public ngOnInit() {}

  public openLink (event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);

  }
}
