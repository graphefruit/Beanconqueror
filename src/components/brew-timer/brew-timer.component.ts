import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

import { ITimer } from '../../interfaces/timer/iTimer';
import moment from 'moment';
import { DatetimePopoverComponent } from '../../popover/datetime-popover/datetime-popover.component';
import { ModalController } from '@ionic/angular';

import { CoffeeBluetoothDevicesService } from '@graphefruit/coffee-bluetooth-devices';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { Settings } from '../../classes/settings/settings';

@Component({
  selector: 'brew-timer',
  templateUrl: './brew-timer.component.html',
  styleUrls: ['./brew-timer.component.scss'],
})
export class BrewTimerComponent implements OnInit, OnDestroy {
  @Input() public label: string;

  @Output() public timerStarted = new EventEmitter();
  @Output() public timerPaused = new EventEmitter();
  @Output() public timerReset = new EventEmitter();
  @Output() public timerResumed = new EventEmitter();
  @Output() public timerTicked = new EventEmitter();
  @Output() public bloomTimer = new EventEmitter();
  @Output() public dripTimer = new EventEmitter();
  @Output() public tareScale = new EventEmitter();

  public displayingTime: string = moment().startOf('day').toISOString();

  private _dripTimerVisible: boolean;

  private startingDay;
  private startedTimer;
  private pausedTimer;
  private startedOffset;
  get dripTimerVisible(): boolean {
    return this._dripTimerVisible;
  }

  @Input() set dripTimerVisible(value: boolean) {
    this._dripTimerVisible = value;

    this.showDripTimer = this._dripTimerVisible;
  }

  private _bloomTimerVisible: boolean;

  get bloomTimerVisible(): boolean {
    return this._bloomTimerVisible;
  }

  public showBloomTimer: boolean = true;
  public showDripTimer: boolean = true;

  @Input() set bloomTimerVisible(value: boolean) {
    this._bloomTimerVisible = value;
    this.showBloomTimer = this._bloomTimerVisible;
  }

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
    this.showBloomTimer = this.bloomTimerVisible;
    this.showDripTimer = this.dripTimerVisible;

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

  public __tareScale(): void {
    this.tareScale.emit();
  }

  public pauseTimer(): void {
    this.pausedTimer = moment(new Date());
    this.timerPaused.emit();
    this.timer.runTimer = false;
    this.timerPaused.emit();
    this.changeEvent();
  }

  public bloomTime(): void {
    this.showBloomTimer = false;
    this.bloomTimer.emit(this.getSeconds());
  }

  public dripTime(): void {
    this.showDripTimer = false;
    this.dripTimer.emit(this.getSeconds());
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

  public getSecondsAsDigitalClock(inputSeconds: number): string {
    const sec_num = parseInt(inputSeconds.toString(), 10); // don't forget the second param
    const hours = Math.floor(sec_num / 3600);
    const minutes = Math.floor((sec_num - hours * 3600) / 60);
    const seconds = sec_num - hours * 3600 - minutes * 60;
    const hoursString = hours < 10 ? `0${hours}` : hours.toString();
    const minutesString = minutes < 10 ? `0${minutes}` : minutes.toString();
    const secondsString = seconds < 10 ? `0${seconds}` : seconds.toString();

    return `${hoursString}:${minutesString}:${secondsString}`;
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
