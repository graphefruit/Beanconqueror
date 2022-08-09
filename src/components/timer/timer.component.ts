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
import { CoffeeBluetoothDevicesService } from '@graphefruit/coffee-bluetooth-devices';
import { UISettingsStorage } from '../../services/uiSettingsStorage';

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
      this.startedTimer = moment(startingDate);
      this.startedOffset = this.startedTimer.diff(this.startingDay);
    } else {
      const restartTimer = moment(new Date());

      this.startedOffset += restartTimer.diff(this.pausedTimer);
    }
    this.timer.hasStarted = true;
    this.timer.runTimer = true;
    this.timerTick();
    if (this.settings?.brew_milliseconds) {
      this.millisecondTick();
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
      cssClass: 'half-bottom-modal',
      showBackdrop: true,
      backdropDismiss: true,
      swipeToClose: true,
      componentProps: { displayingTime: this.displayingTime },
    });
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (
      modalData !== undefined &&
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
      this.changeEvent();
    }
  }
}
