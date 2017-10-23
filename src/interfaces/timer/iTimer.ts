/**
 * Created by lars on 10/18/2017.
 */
export interface ITimer {
  seconds: number;
  runTimer: boolean;
  hasStarted: boolean;
  hasFinished: boolean;
  displayTime: string;
}
