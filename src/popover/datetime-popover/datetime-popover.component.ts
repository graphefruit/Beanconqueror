import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { IonInput, ModalController } from '@ionic/angular';
import moment from 'moment';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { Settings } from '../../classes/settings/settings';

@Component({
  selector: 'app-datetime-popover',
  templateUrl: './datetime-popover.component.html',
  styleUrls: ['./datetime-popover.component.scss'],
  standalone: false,
})
export class DatetimePopoverComponent implements OnInit {
  public timer = {
    HOURS: 0,
    MINUTES: 0,
    SECONDS: 0,
    MILLISECONDS: 0,
  };

  public colSize: number = 3;

  public maxMilliSecond: number = 999;

  @ViewChild('secondInput', { static: false }) public secondInput: IonInput;

  @Input() public displayingTime: string;
  public settings: Settings;
  constructor(
    private readonly modalCtrl: ModalController,
    private readonly uiSettingsStorage: UISettingsStorage,
  ) {}

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
    const passedDisplayingTime = moment(this.displayingTime);

    this.timer.HOURS = passedDisplayingTime.hours();
    this.timer.MINUTES = passedDisplayingTime.minutes();
    this.timer.SECONDS = passedDisplayingTime.seconds();
    this.timer.MILLISECONDS = passedDisplayingTime.milliseconds();
    this.colSize = this.getColSize();
  }
  public ionViewDidEnter(): void {
    /**
     * To many "issues" on the user side, so we disable this feature for now.
     * setTimeout(() => {
      //Give it a short time
      this.secondInput.setFocus();
    }, 250);**/
  }

  public saveSettings() {
    this.uiSettingsStorage.saveSettings(this.settings);
  }

  public getColSize() {
    const showMilliSeconds = this.settings?.brew_milliseconds;
    const showHours: boolean = this.settings.brew_timer_show_hours;
    const showMinutes: boolean = this.settings.brew_timer_show_minutes;

    let sizeCounter = 0;
    if (showMilliSeconds) {
      sizeCounter = sizeCounter + 1;
    }
    if (showHours) {
      sizeCounter = sizeCounter + 1;
    }
    if (showMinutes) {
      sizeCounter = sizeCounter + 1;
    }
    if (sizeCounter === 0) {
      //Just seconds are shown
      return 12;
    } else if (sizeCounter === 1) {
      //Just seconds +1 is shown
      return 6;
    } else if (sizeCounter === 2) {
      //seconds +2 are shown
      return 4;
    } else {
      return 3;
    }
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
      'datetime-popover',
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
      'datetime-popover',
    );
  }
}
