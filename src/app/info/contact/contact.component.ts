import { Component, OnInit } from '@angular/core';
import { UIHelper } from '../../../services/uiHelper';
import LINK_TRACKING from '../../../data/tracking/linkTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';

@Component({
  selector: 'contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  standalone: false,
})
export class ContactComponent implements OnInit {
  constructor(
    private readonly uiHelper: UIHelper,
    private readonly uiAnalytics: UIAnalytics,
  ) {}

  public ngOnInit() {}

  public openGithub() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.GITHUB,
    );
    this.uiHelper.openExternalWebpage(
      'https://github.com/graphefruit/Beanconqueror',
    );
  }
  public openWebsite() {
    this.uiAnalytics.trackEvent(
      LINK_TRACKING.TITLE,
      LINK_TRACKING.ACTIONS.WEBSITE,
    );
    this.uiHelper.openExternalWebpage('https://beanconqueror.com');
  }
}
