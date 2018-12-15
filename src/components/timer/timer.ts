import {Component, EventEmitter, Input, Output,} from '@angular/core';
import {ITimer} from '../../interfaces/timer/iTimer';


@Component({
  selector: 'timer',
  templateUrl: 'timer.html'
})
export class TimerComponent {

  @Input() label:string;
  @Input() timeInSeconds: number;
  @Output() timerStarted =new EventEmitter();
  public timer: ITimer;

  constructor() {
  }

  ngOnInit() {
    this.initTimer();
  }

  hasFinished() {
    return this.timer.hasFinished;
  }

  public setTime(seconds:number){
    this.timer.seconds = seconds;

    this.timer.displayTime = this.getSecondsAsDigitalClock(this.timer.seconds);
  }

  initTimer() {
    if(!this.timeInSeconds) { this.timeInSeconds = 0; }

    this.timer = <ITimer>{
      runTimer: false,
      hasStarted: false,
      hasFinished: false,
      seconds: this.timeInSeconds
    };

    this.timer.displayTime = this.getSecondsAsDigitalClock(this.timer.seconds);
  }

  startTimer() {
    this.timer.hasStarted = true;
    this.timer.runTimer = true;
    this.timerStarted.emit();
    this.timerTick();
  }

  pauseTimer() {
    this.timer.runTimer = false;
  }

  resumeTimer() {
    this.startTimer();
  }

  timerTick() {
    setTimeout(() => {
      if (!this.timer.runTimer) { return; }
      this.timer.seconds++;
      this.timer.displayTime = this.getSecondsAsDigitalClock(this.timer.seconds);
      this.timerTick();
    }, 1000);
  }
public getSeconds(){
    return this.timer.seconds;
}

  getSecondsAsDigitalClock(inputSeconds: number) {
    var sec_num = parseInt(inputSeconds.toString(), 10); // don't forget the second param
    var hours   = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    var seconds = sec_num - (hours * 3600) - (minutes * 60);
    var hoursString = '';
    var minutesString = '';
    var secondsString = '';
    hoursString = (hours < 10) ? "0" + hours : hours.toString();
    minutesString = (minutes < 10) ? "0" + minutes : minutes.toString();
    secondsString = (seconds < 10) ? "0" + seconds : seconds.toString();
    return hoursString + ':' + minutesString + ':' + secondsString;
  }

}
