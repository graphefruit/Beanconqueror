import { Component, OnInit } from '@angular/core';
import {UIHelper} from '../../../services/uiHelper';
import {Settings} from '../../../classes/settings/settings';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIAnalytics} from '../../../services/uiAnalytics';

@Component({
  selector: 'privacy',
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.scss'],
})
export class PrivacyComponent implements OnInit {

  constructor(private readonly uiHelper: UIHelper,private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiAnalytics: UIAnalytics) { }

  public ngOnInit() {}

  public openLink (event, _link: string): void {
    event.cancelBubble = true;
    event.preventDefault();
    this.uiHelper.openExternalWebpage(_link);

  }
  public disableTracking() {

  }
}
