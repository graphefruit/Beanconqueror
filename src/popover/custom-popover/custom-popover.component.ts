import {Component, OnInit} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';

@Component({
  selector: 'custom-popover',
  templateUrl: './custom-popover.component.html',
  styleUrls: ['./custom-popover.component.scss'],
})
export class CustomPopoverComponent implements OnInit {

  public title: string = '';
  public description: string = '';
  public okText: string = '';

  constructor(private readonly modalController: ModalController,
              private readonly navParams: NavParams) {
  }

  public ngOnInit() {

    this.title = this.navParams.get('title');
    this.description = this.navParams.get('description');
    this.okText = this.navParams.get('okText');

  }

  public ok() {
    this.modalController.dismiss({
      dismissed: true
    });

  }
}
