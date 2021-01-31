import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

import {ITimer} from '../../interfaces/timer/iTimer';
import moment from 'moment';
import {DatetimePopoverComponent} from '../../popover/datetime-popover/datetime-popover.component';
import {ModalController} from '@ionic/angular';


@Component({
  selector: ' brew-timer',
  templateUrl: './brew-timer.component.html',
  styleUrls: ['./brew-timer.component.scss'],
})
export class BrewTimerComponent implements OnInit {
  @Input() public label: string;
  @Input() public timeInSeconds: number;
  public displayingTime: string = moment().startOf('day').toISOString();

  private _dripTimerVisible: boolean;

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

  @Output() public timerStarted = new EventEmitter();
  @Output() public timerPaused = new EventEmitter();
  @Output() public timerTicked = new EventEmitter();
  @Output() public bloomTimer = new EventEmitter();
  @Output() public dripTimer = new EventEmitter();


  public showBloomTimer: boolean = true;
  public showDripTimer: boolean = true;

  @Input() set bloomTimerVisible(value: boolean) {
    this._bloomTimerVisible = value;
    this.showBloomTimer = this._bloomTimerVisible;
  }
  public timer: ITimer;

  constructor(private readonly modalCtrl: ModalController) {
  }

  public ngOnInit(): void {
    this.initTimer();

  }

  public hasFinished(): boolean {
    return this.timer.hasFinished;
  }

  public setTime(seconds: number): void {
    this.timer.seconds = seconds;

    this.timer.displayTime = this.getSecondsAsDigitalClock(this.timer.seconds);
    this.displayingTime = moment(this.displayingTime).startOf('day').add('seconds',this.timer.seconds).toISOString();
  }

  public initTimer(): void {
    if (!this.timeInSeconds) {
      this.timeInSeconds = 0;
    }
    // tslint:disable-next-line
    this.timer = {
      runTimer: false,
      hasStarted: false,
      hasFinished: false,
      seconds: this.timeInSeconds
    } as ITimer;
    this.showBloomTimer = this.bloomTimerVisible;
    this.showDripTimer = this.dripTimerVisible;

    this.timer.displayTime = this.getSecondsAsDigitalClock(this.timer.seconds);
    this.displayingTime = moment(this.displayingTime).startOf('day').add('seconds',this.timer.seconds).toISOString();
  }

  public startTimer(): void {
    this.timer.hasStarted = true;
    this.timer.runTimer = true;
    this.timerStarted.emit();
    this.timerTick();
  }

  public pauseTimer(): void {
    this.timerPaused.emit();
    this.timer.runTimer = false;
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
    this.startTimer();
  }

  public timerTick(): void {
    setTimeout(() => {
      if (!this.timer.runTimer) {
        return;
      }
      this.timer.seconds++;
      this.timer.displayTime = this.getSecondsAsDigitalClock(this.timer.seconds);
      this.displayingTime = moment(this.displayingTime).startOf('day').add('seconds',this.timer.seconds).toISOString();
      this.timerTick();
      this.timerTicked.emit();
    }, 1000);
  }

  public getSeconds(): number {
    return this.timer.seconds;
  }

  public reset() {
    this.timeInSeconds = 0;
    this.initTimer();
    this.timerTicked.emit();
  }
  public formatSeconds(): string {
    const secs = this.getSeconds();

    const formatted = moment.utc(secs * 1000).format('mm:ss');
    return formatted;
  }

  public changeEvent() {
    this.timerTicked.emit();
  }

  public getSecondsAsDigitalClock(inputSeconds: number): string {
    const sec_num = parseInt(inputSeconds.toString(), 10); // don't forget the second param
    const hours = Math.floor(sec_num / 3600);
    const minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    const seconds = sec_num - (hours * 3600) - (minutes * 60);
    const hoursString = (hours < 10) ? `0${hours}` : hours.toString();
    const minutesString = (minutes < 10) ? `0${minutes}` : minutes.toString();
    const secondsString = (seconds < 10) ? `0${seconds}` : seconds.toString();

    return `${hoursString}:${minutesString}:${secondsString}`;
  }
  public changeDate(_event) {
    const durationPassed =  moment.duration(moment(_event).diff(moment(_event).startOf('day')));
    this.displayingTime = moment(_event).toISOString();
    this.timer.seconds = durationPassed.asSeconds();
    // Emit event so parent page can do something
    this.changeEvent();
  }
  public async showTimeOverlay(_event) {
    _event.stopPropagation();
    _event.stopImmediatePropagation();

    const modal = await this.modalCtrl.create({component: DatetimePopoverComponent,
      id:'datetime-popover',
      cssClass: 'half-bottom-modal',
      showBackdrop: true,
      backdropDismiss: true,
      swipeToClose: true,
      componentProps: {displayingTime: this.displayingTime}});
    await modal.present();
    const modalData = await modal.onWillDismiss();
    if (modalData.data.displayingTime !== undefined) {
      this.displayingTime = modalData.data.displayingTime;
      this.timer.seconds = moment.duration(moment(this.displayingTime).diff(moment(this.displayingTime).startOf('day'))).asSeconds();
      this.changeEvent();
    }

  }
}
