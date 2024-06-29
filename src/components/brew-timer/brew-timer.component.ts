import {
  ChangeDetectorRef,
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
import { ModalController, Platform } from '@ionic/angular';

import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { Settings } from '../../classes/settings/settings';
import { CoffeeBluetoothDevicesService } from '../../services/coffeeBluetoothDevices/coffee-bluetooth-devices.service';
import { Device } from '@awesome-cordova-plugins/device/ngx';

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
  @Output() public listeningToScaleChange = new EventEmitter();
  @Output() public ignoreWeight = new EventEmitter();
  @Output() public unignoreWeight = new EventEmitter();

  @Output() public timerStartPressed = new EventEmitter();
  @Output() public timerResumedPressed = new EventEmitter();

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
  public showListeningButton: boolean = true;
  public showIgnoreScaleWeightButtonVisible: boolean = true;

  @Input() set bloomTimerVisible(value: boolean) {
    this._bloomTimerVisible = value;
    this.showBloomTimer = this._bloomTimerVisible;
  }
  private _listeningButtonVisible: boolean;
  @Input() set listeningButtonVisible(value: boolean) {
    this._listeningButtonVisible = value;
    this.showListeningButton = this._listeningButtonVisible;
  }

  public get listeningButtonVisible(): boolean {
    return this._listeningButtonVisible;
  }

  private _ignoreScaleWeightButtonVisible: boolean;
  @Input() set ignoreScaleWeightButtonVisible(value: boolean) {
    this._ignoreScaleWeightButtonVisible = value;
    this.showIgnoreScaleWeightButtonVisible =
      this._ignoreScaleWeightButtonVisible;
  }

  public get ignoreScaleWeightButtonVisible(): boolean {
    return this._ignoreScaleWeightButtonVisible;
  }

  public ignoreWeightButtonActive: boolean = true;
  public unignoreWeightButtonActive: boolean = false;

  public timer: ITimer;
  public settings: Settings;
  constructor(
    private readonly modalCtrl: ModalController,
    private readonly bleManager: CoffeeBluetoothDevicesService,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly changeDetectorRef: ChangeDetectorRef,
    private readonly platform: Platform,
    private readonly device: Device
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public smartScaleConnected() {
    try {
      return this.bleManager.getScale() !== null;
    } catch (ex) {
      return false;
    }
  }

  public smartScaleSupportsTaring() {
    try {
      return this.bleManager.getScale().supportsTaring;
    } catch (ex) {}
  }

  public ngOnInit(): void {
    this.initTimer();
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

  public isTimerRunning() {
    return this.timer.runTimer;
  }

  public ngOnDestroy(): void {
    this.timer.runTimer = false;
  }

  public hasFinished(): boolean {
    return this.timer.hasFinished;
  }

  public initTimer(_resetButtons: boolean = true): void {
    /**
     * If Resetbuttons is false, we likely had the "listening" feature for the scale, so this button was presesd, but we don'T want to reset the buttons in the end
     */
    // tslint:disable-next-line
    this.timer = {
      runTimer: false,
      hasStarted: false,
      hasFinished: false,
      seconds: 0,
      milliseconds: 0,
    } as ITimer;

    if (_resetButtons === true) {
      this.showBloomTimer = this.bloomTimerVisible;
      this.showDripTimer = this.dripTimerVisible;
      this.showListeningButton = this.listeningButtonVisible;
    }

    this.displayingTime = moment(this.displayingTime)
      .startOf('day')
      .add('seconds', this.timer.seconds)
      .add('milliseconds', this.timer.milliseconds)
      .toISOString();
  }

  private __preventEventClickOnIos(_event) {
    try {
      //Just do this on iOS 16.X...
      if (
        _event &&
        this.platform.is('ios') &&
        this.device.version.indexOf('16.') >= 0
      ) {
        _event.cancelBubble = true;
        _event.preventDefault();
        _event.stopImmediatePropagation();
        _event.stopPropagation();
        _event.target.blur();
      }
    } catch (ex) {}
  }

  public __startTimer(_event) {
    this.__preventEventClickOnIos(_event);
    if (this.timerStartPressed.observers.length > 0) {
      this.timerStartPressed.emit();
    } else {
      this.startTimer();
    }
  }
  public checkChanges() {
    // #507 Wrapping check changes in set timeout so all values get checked
    setTimeout(() => {
      this.changeDetectorRef.detectChanges();
      window.getComputedStyle(window.document.getElementsByTagName('body')[0]);
    }, 15);
  }

  public startTimer(_resumed: boolean = false, _emit: boolean = true): void {
    if (_resumed === false) {
      const startingDate = moment().toDate();
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
      const restartTimer = moment(moment().toDate());

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
      if (this.timerStartPressed.observers.length <= 0) {
        if (_emit) {
          this.timerStarted.emit();
        }
      }
    }

    this.changeEvent();
  }

  public __tareScale(_event = null): void {
    this.__preventEventClickOnIos(_event);
    this.tareScale.emit();
  }

  public pauseTimer(_type = 'click', _event = null): void {
    this.__preventEventClickOnIos(_event);
    this.timer.runTimer = false;
    this.pausedTimer = moment(moment().toDate());
    this.timerPaused.emit(_type);
    this.changeEvent();
  }

  public ignoreScaleWeight(_event = null) {
    this.__preventEventClickOnIos(_event);
    this.ignoreWeightButtonActive = false;
    this.unignoreWeightButtonActive = true;
    this.ignoreWeight.emit();
  }
  public unignoreScaleWeight(_event = null) {
    this.__preventEventClickOnIos(_event);
    this.ignoreWeightButtonActive = true;
    this.unignoreWeightButtonActive = false;
    this.unignoreWeight.emit();
  }

  public startListening(_event = null) {
    this.__preventEventClickOnIos(_event);
    this.showListeningButton = false;
    this.listeningToScaleChange.emit();
  }
  public bloomTime(_event = null): void {
    this.__preventEventClickOnIos(_event);
    this.showBloomTimer = false;
    this.bloomTimer.emit(this.getSeconds());
  }

  public dripTime(_event = null): void {
    this.__preventEventClickOnIos(_event);
    this.showDripTimer = false;
    this.dripTimer.emit(this.getSeconds());
  }

  public __resumeTimer(_event = null) {
    this.__preventEventClickOnIos(_event);
    if (this.timerResumedPressed.observers.length > 0) {
      this.timerResumedPressed.emit();
    } else {
      this.resumeTimer();
    }
  }

  public resumeTimer(): void {
    this.startTimer(true);
    if (this.timerResumedPressed.observers.length <= 0) {
      this.timerResumed.emit();
    }
  }

  public millisecondTick(): void {
    setTimeout(() => {
      if (!this.timer.runTimer) {
        return;
      }
      const milliSecondTimer = moment(moment().toDate()).subtract(
        this.startedOffset
      );

      this.timer.milliseconds = milliSecondTimer.milliseconds();
      const passedSeconds = milliSecondTimer.diff(this.startingDay, 'seconds');
      this.timer.seconds = passedSeconds;

      this.displayingTime = moment(this.displayingTime)
        .startOf('day')
        .add('seconds', this.timer.seconds)
        .add('milliseconds', this.timer.milliseconds)
        .toISOString();
      this.millisecondTick();
      this.changeEvent();
    }, 10);
  }
  public timerTick(): void {
    setTimeout(() => {
      if (!this.timer.runTimer) {
        return;
      }

      const actualDate = moment().toDate();

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
    }, 1000);
  }

  public getSeconds(): number {
    return this.timer.seconds;
  }
  public getMilliseconds(): number {
    return this.timer.milliseconds;
  }

  public reset(_resetButtons: boolean = true, _event = null) {
    this.__preventEventClickOnIos(_event);
    this.timerReset.emit();
    this.initTimer(_resetButtons);
    this.changeEvent();
  }

  public resetWithoutEmit(_resetButtons: boolean = true) {
    this.initTimer(_resetButtons);
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
    try {
      //Just do this on iOS 16.X...
      if (
        _event &&
        this.platform.is('ios') &&
        this.device.version.indexOf('16.') >= 0
      ) {
        if (_event.target.outerHTML.indexOf('<ion-input') >= 0) {
          /** If <ion-input is the start, the click was somehow done by the button, else just the "input" is clicked...
           * Thats why we return here, and ignore the click.
           */
          return;
        }
      }
    } catch (ex) {}

    _event.stopPropagation();
    _event.stopImmediatePropagation();

    const modal = await this.modalCtrl.create({
      component: DatetimePopoverComponent,
      id: 'datetime-popover',
      cssClass: 'popover-actions',
      animated: true,
      breakpoints: [0, 0.5, 0.75, 1],
      initialBreakpoint: 0.75,
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
      const startingDate = moment().toDate();
      this.pausedTimer = moment(moment().toDate());
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
