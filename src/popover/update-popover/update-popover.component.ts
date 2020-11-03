import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {IonSlides, ModalController} from '@ionic/angular';

@Component({
  selector: 'app-update-popover',
  templateUrl: './update-popover.component.html',
  styleUrls: ['./update-popover.component.scss'],
})
export class UpdatePopoverComponent implements OnInit {

  @Input() public versions: Array<string>;
  public slideOpts = {
    allowTouchMove: true,
    speed: 400
  };
  public slide: number = 1;
  @ViewChild('slider', {static: false}) public welcomeSlider: IonSlides;

  constructor(private readonly modalController: ModalController) { }

  public ngOnInit() {}

  public dismiss() {
    this.modalController.dismiss({
      dismissed: true
    }, undefined, 'update-popover');
  }
}
