import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
})
export class ContactComponent implements OnInit {

  constructor() { }

  public ngOnInit() {}
  public openLink(event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    //this.uiHelper.openExternalWebpage(_link);

  }

}
