import {Component, OnInit} from '@angular/core';
import {UIHelper} from '../../../services/uiHelper';

@Component({
  selector: 'contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
})
export class ContactComponent implements OnInit {

  constructor(private readonly uiHelper: UIHelper) { }

  public ngOnInit() {}
  public openLink(event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);

  }

}
