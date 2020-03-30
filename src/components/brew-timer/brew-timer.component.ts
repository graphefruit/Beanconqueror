import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

import {ITimer} from '../../interfaces/timer/iTimer';
import moment from 'moment';

@Component({
  selector: 'brew-timer',
  templateUrl: './brew-timer.component.html',
  styleUrls: ['./brew-timer.component.scss'],
})
export class BrewTimerComponent implements OnInit {
  @Input() public label: string;
  @Input() public timeInSeconds: number;
  @Input() public dripTimerVisible: boolean;
  @Input() public bloomTimerVisible: boolean;

  @Output() public timerStarted = new EventEmitter();
  @Output() public timerPaused = new EventEmitter();
  @Output() public timerTicked = new EventEmitter();
  @Output() public bloomTimer = new EventEmitter();
  @Output() public dripTimer = new EventEmitter();


  public showBloomTimer: boolean = true;
  public showDripTimer: boolean = true;

  public timer: ITimer;

  constructor() {
  }

  public ngOnInit(): void {
    this.initTimer();
    this.showBloomTimer = this.bloomTimerVisible;
    this.showDripTimer = this.dripTimerVisible;
  }

  public hasFinished(): boolean {
    return this.timer.hasFinished;
  }

  public setTime(seconds: number): void {
    this.timer.seconds = seconds;

    this.timer.displayTime = this.getSecondsAsDigitalClock(this.timer.seconds);
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

    this.timer.displayTime = this.getSecondsAsDigitalClock(this.timer.seconds);
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
      this.timerTick();
      this.timerTicked.emit();
    }, 1000);
  }

  public getSeconds(): number {
    return this.timer.seconds;
  }

  public formatSeconds(): string {
    const secs = this.getSeconds();

    const formatted = moment.utc(secs * 1000).format('mm:ss');
    return formatted;
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
}
