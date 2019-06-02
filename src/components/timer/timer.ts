import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ITimer } from '../../interfaces/timer/iTimer';

@Component({
  selector: 'timer',
  templateUrl: 'timer.html'
})
export class TimerComponent {

  @Input() public label: string;
  @Input() public timeInSeconds: number;
  @Output() public timerStarted = new EventEmitter();
  public timer: ITimer;

  public ngOnInit() {
    this.initTimer();
  }

  public hasFinished() {
    return this.timer.hasFinished;
  }

  public setTime(seconds: number) {
    this.timer.seconds = seconds;

    this.timer.displayTime = this.getSecondsAsDigitalClock(this.timer.seconds);
  }

  public initTimer() {
    if (!this.timeInSeconds) { this.timeInSeconds = 0; }

    this.timer = {
      runTimer: false,
      hasStarted: false,
      hasFinished: false,
      seconds: this.timeInSeconds
    } as ITimer;

    this.timer.displayTime = this.getSecondsAsDigitalClock(this.timer.seconds);
  }

  public startTimer() {
    this.timer.hasStarted = true;
    this.timer.runTimer = true;
    this.timerStarted.emit();
    this.timerTick();
  }

  public pauseTimer() {
    this.timer.runTimer = false;
  }

  public resumeTimer() {
    this.startTimer();
  }

  public timerTick() {
    setTimeout(() => {
      if (!this.timer.runTimer) { return; }
      this.timer.seconds++;
      this.timer.displayTime = this.getSecondsAsDigitalClock(this.timer.seconds);
      this.timerTick();
    }, 1000);
  }
  public getSeconds() {
    return this.timer.seconds;
}

  public getSecondsAsDigitalClock(inputSeconds: number) {
    let sec_num = parseInt(inputSeconds.toString(), 10); // don't forget the second param
    let hours   = Math.floor(sec_num / 3600);
    let minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    let seconds = sec_num - (hours * 3600) - (minutes * 60);
    let hoursString = '';
    let minutesString = '';
    let secondsString = '';
    hoursString = (hours < 10) ? '0' + hours : hours.toString();
    minutesString = (minutes < 10) ? '0' + minutes : minutes.toString();
    secondsString = (seconds < 10) ? '0' + seconds : seconds.toString();
    return hoursString + ':' + minutesString + ':' + secondsString;
  }

}
