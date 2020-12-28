import {Component, Input, OnInit} from '@angular/core';
import {ModalController} from '@ionic/angular';
import moment from 'moment';

@Component({
  selector: 'app-datetime-popover',
  templateUrl: './datetime-popover.component.html',
  styleUrls: ['./datetime-popover.component.scss'],
})
export class DatetimePopoverComponent implements OnInit {

  public timer =  {
    HOURS: 0,
    MINUTES: 0,
    SECONDS: 0,
  };

  @Input() public displayingTime: string;
  constructor(private readonly modalCtrl: ModalController) {

  }

  public ngOnInit() {
    const passedDisplayingTime = moment(this.displayingTime);

    this.timer.HOURS = passedDisplayingTime.hours();
    this.timer.MINUTES = passedDisplayingTime.minutes();
    this.timer.SECONDS = passedDisplayingTime.seconds();
  }

  public dismiss(): void {
    this.modalCtrl.dismiss({
      dismissed: true
    },undefined, 'datetime-popover');

  }

  public choose() {
    const newDisplayingTime = moment().startOf('day');
    if (this.timer.SECONDS>0) {
      newDisplayingTime.add('seconds', this.timer.SECONDS);
    }
    if (this.timer.MINUTES>0) {
      newDisplayingTime.add('minutes', this.timer.MINUTES);
    }
    if (this.timer.HOURS>0){
      newDisplayingTime.add('hours',this.timer.HOURS);
    }
    this.modalCtrl.dismiss({
      displayingTime: newDisplayingTime.toISOString()
    },undefined, 'datetime-popover');
  }

}
