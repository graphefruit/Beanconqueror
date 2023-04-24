import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

import { ITimer } from '../../interfaces/timer/iTimer';
import { DatetimePopoverComponent } from '../../popover/datetime-popover/datetime-popover.component';
import moment from 'moment';
import { ModalController } from '@ionic/angular';
import { Settings } from '../../classes/settings/settings';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { CoffeeBluetoothDevicesService } from '../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';

@Component({
  selector: 'timer',
  templateUrl: './timer.component.html',
  styleUrls: ['./timer.component.scss'],
})
export class TimerComponent implements OnInit, OnDestroy {
  @Input() public label: string;
  @Input('hide-control-buttons') public hideControlButtons: boolean = false;
  @Output() public timerStarted = new EventEmitter();
  @Output() public timerPaused = new EventEmitter();
  @Output() public timerReset = new EventEmitter();
  @Output() public timerResumed = new EventEmitter();
  @Output() public timerTicked = new EventEmitter();

  public displayingTime: string = moment().startOf('day').toISOString();

  private startingDay;
  private startedTimer;
  private pausedTimer;
  private startedOffset;

  public timer: ITimer;
  public settings: Settings;
  constructor(
    private readonly modalCtrl: ModalController,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly uiSettingsStorage: UISettingsStorage
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public smartScaleConnected() {
    try {
      return this.bleManager.getScale() !== null;
    } catch (ex) {}
  }

  public ngOnInit(): void {
    this.initTimer();
  }

  public isTimerRunning() {
    return this.timer.runTimer;
  }

  public ngOnDestroy(): void {
    this.timer.runTimer = false;
  }

  public hasFinished(): boolean {
    return this.timer.hasFinished;
  }

  public returnWantedDisplayFormat() {
    const showMinutes: boolean = true;
    let showHours: boolean = false;
    let showMilliseconds: boolean = false;
    if (this.timer.seconds >= 3600) {
      showHours = true;
    }
    if (this.settings?.brew_milliseconds) {
      showMilliseconds = true;
    }

    let returnStr: string = '';
    if (showMilliseconds) {
      if (this.settings.brew_milliseconds_leading_digits === 3) {
        returnStr = '.SSS';
      } else if (this.settings.brew_milliseconds_leading_digits === 2) {
        returnStr = '.SS';
      } else {
        returnStr = '.S';
      }
    }
    if (showHours) {
      return 'H:mm:ss' + returnStr;
    } else if (showMinutes) {
      return 'mm:ss' + returnStr;
    } else {
      return 'ss' + returnStr;
    }
  }

  public initTimer(): void {
    // tslint:disable-next-line
    this.timer = {
      runTimer: false,
      hasStarted: false,
      hasFinished: false,
      seconds: 0,
      milliseconds: 0,
    } as ITimer;

    this.displayingTime = moment(this.displayingTime)
      .startOf('day')
      .add('seconds', this.timer.seconds)
      .add('milliseconds', this.timer.milliseconds)
      .toISOString();
  }

  public startTimer(_resumed: boolean = false): void {
    if (_resumed === false) {
      const startingDate = new Date();
      this.startingDay = moment(startingDate).startOf('day');
      if (this.timer.seconds > 0 || this.timer.milliseconds > 0) {
        // We need to subtract, if the time is already given on start (like repeat or preset)
        this.startedTimer = moment(startingDate)
          .subtract(this.timer.seconds, 'seconds')
          .subtract(this.timer.milliseconds, 'milliseconds');
      } else {
        this.startedTimer = moment(startingDate);
      }

      this.startedOffset = this.startedTimer.diff(this.startingDay);
    } else {
      const restartTimer = moment(new Date());

      this.startedOffset += restartTimer.diff(this.pausedTimer);
    }
    this.timer.hasStarted = true;
    this.timer.runTimer = true;
    if (this.settings?.brew_milliseconds) {
      this.millisecondTick();
    } else {
      this.timerTick();
    }

    if (_resumed === false) {
      this.timerStarted.emit();
    }

    this.changeEvent();
  }

  public pauseTimer(): void {
    this.pausedTimer = moment(new Date());
    this.timerPaused.emit();
    this.timer.runTimer = false;
    this.timerPaused.emit();
    this.changeEvent();
  }

  public resumeTimer(): void {
    this.startTimer(true);
    this.timerResumed.emit();
  }

  public millisecondTick(): void {
    setTimeout(() => {
      if (!this.timer.runTimer) {
        return;
      }
      const milliSecondTimer = moment(new Date()).subtract(this.startedOffset);

      this.timer.milliseconds = milliSecondTimer.milliseconds();

      this.displayingTime = moment(this.displayingTime)
        .startOf('day')
        .add('seconds', this.timer.seconds)
        .add('milliseconds', this.timer.milliseconds)
        .toISOString();
      this.millisecondTick();
    }, 10);
  }
  public timerTick(): void {
    setTimeout(() => {
      if (!this.timer.runTimer) {
        return;
      }

      const actualDate = new Date();

      const actualTimerTick = moment(actualDate).subtract(this.startedOffset);

      const passedSeconds = actualTimerTick.diff(this.startingDay, 'seconds');
      this.timer.seconds = passedSeconds;

      this.displayingTime = moment(this.displayingTime)
        .startOf('day')
        .add('seconds', this.timer.seconds)
        .add('milliseconds', this.timer.milliseconds)
        .toISOString();

      this.timerTick();
      this.changeEvent();
    }, 10);
  }

  public getSeconds(): number {
    return this.timer.seconds;
  }
  public getMilliseconds(): number {
    return this.timer.milliseconds;
  }

  public reset() {
    this.timerReset.emit();
    this.initTimer();
    this.changeEvent();
  }

  public formatSeconds(): string {
    const secs = this.getSeconds();

    const formatted = moment.utc(secs * 1000).format('mm:ss');
    return formatted;
  }

  public changeEvent() {
    this.timerTicked.emit();
  }
  public setTime(seconds: number, milliseconds: number = 0): void {
    this.timer.seconds = seconds;
    if (milliseconds !== 0) {
      this.timer.milliseconds = milliseconds;
    }
    this.displayingTime = moment(this.displayingTime)
      .startOf('day')
      .add('seconds', this.timer.seconds)
      .add('milliseconds', this.timer.milliseconds)
      .toISOString();
  }

  public changeDate(_event) {
    const durationPassed = moment.duration(
      moment(_event).diff(moment(_event).startOf('day'))
    );
    this.displayingTime = moment(_event).toISOString();
    this.timer.seconds = durationPassed.asSeconds();
    // Emit event so parent page can do something
    this.changeEvent();
  }

  public async showTimeOverlay(_event) {
    _event.stopPropagation();
    _event.stopImmediatePropagation();

    const modal = await this.modalCtrl.create({
      component: DatetimePopoverComponent,
      id: 'datetime-popover',
      cssClass: 'popover-actions',
      breakpoints: [0, 0.5, 0.75, 1],
      initialBreakpoint: 0.5,
      componentProps: { displayingTime: this.displayingTime },
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (
      modalData !== undefined &&
      modalData.data &&
      modalData.data.displayingTime !== undefined
    ) {
      this.displayingTime = modalData.data.displayingTime;
      this.timer.seconds = moment
        .duration(
          moment(this.displayingTime).diff(
            moment(this.displayingTime).startOf('day')
          )
        )
        .asSeconds();
      this.timer.milliseconds = moment(this.displayingTime)
        .startOf('day')
        .milliseconds();
      // We need to calculate new, else when user starts timer again, the wrong times will be used
      const startingDate = new Date();
      this.pausedTimer = moment(new Date());
      this.startingDay = moment(startingDate).startOf('day');
      if (this.timer.seconds > 0 || this.timer.milliseconds > 0) {
        // We need to subtract, if the time is already given on start (like repeat or preset)
        this.startedTimer = moment(startingDate)
          .subtract(this.timer.seconds, 'seconds')
          .subtract(this.timer.milliseconds, 'milliseconds');
      } else {
        this.startedTimer = moment(startingDate);
      }

      this.startedOffset = this.startedTimer.diff(this.startingDay);

      this.changeEvent();
    }
  }
}
