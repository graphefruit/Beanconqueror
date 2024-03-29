import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import moment from 'moment';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { Settings } from '../../classes/settings/settings';

@Component({
  selector: 'app-datetime-popover',
  templateUrl: './datetime-popover.component.html',
  styleUrls: ['./datetime-popover.component.scss'],
})
export class DatetimePopoverComponent implements OnInit {
  public timer = {
    HOURS: 0,
    MINUTES: 0,
    SECONDS: 0,
    MILLISECONDS: 0,
  };

  @Input() public displayingTime: string;
  public settings: Settings;
  constructor(
    private readonly modalCtrl: ModalController,
    private readonly uiSettingsStorage: UISettingsStorage
  ) {}

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
    const passedDisplayingTime = moment(this.displayingTime);

    this.timer.HOURS = passedDisplayingTime.hours();
    this.timer.MINUTES = passedDisplayingTime.minutes();
    this.timer.SECONDS = passedDisplayingTime.seconds();
    this.timer.MILLISECONDS = passedDisplayingTime.milliseconds();
  }

  public reset() {
    this.timer.HOURS = 0;
    this.timer.MINUTES = 0;
    this.timer.SECONDS = 0;
    this.timer.MILLISECONDS = 0;
  }
  public getMaxMillisecondNumber() {
    return 999;
  }

  public dismiss(): void {
    this.modalCtrl.dismiss(
      {
        dismissed: true,
      },
      undefined,
      'datetime-popover'
    );
  }

  public choose() {
    const newDisplayingTime = moment().startOf('day');
    if (this.timer.MILLISECONDS > 0) {
      newDisplayingTime.add('milliseconds', this.timer.MILLISECONDS);
    }
    if (this.timer.SECONDS > 0) {
      newDisplayingTime.add('seconds', this.timer.SECONDS);
    }
    if (this.timer.MINUTES > 0) {
      newDisplayingTime.add('minutes', this.timer.MINUTES);
    }
    if (this.timer.HOURS > 0) {
      newDisplayingTime.add('hours', this.timer.HOURS);
    }
    this.modalCtrl.dismiss(
      {
        displayingTime: newDisplayingTime.toISOString(),
      },
      undefined,
      'datetime-popover'
    );
  }
}
