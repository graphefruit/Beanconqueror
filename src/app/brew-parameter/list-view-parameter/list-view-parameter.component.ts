import { Component, OnInit } from '@angular/core';
import {Settings} from '../../../classes/settings/settings';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';

@Component({
    selector: 'list-view-parameter',
    templateUrl: './list-view-parameter.component.html',
    styleUrls: ['./list-view-parameter.component.scss'],
    standalone: false
})
export class ListViewParameterComponent implements OnInit {

  public settings: Settings;



  constructor(public uiSettingsStorage: UISettingsStorage) {
    this.__initializeSettings();
  }

  public ngOnInit() {
  }

  private __initializeSettings(): void {
    this.settings = this.uiSettingsStorage.getSettings();

  }



}
