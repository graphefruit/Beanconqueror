import { Component, OnInit } from '@angular/core';
import {IBrew} from '../../interfaces/brew/iBrew';
import {ModalController, NavParams} from '@ionic/angular';
import {UIAnalytics} from '../../services/uiAnalytics';
import {IGreenBean} from '../../interfaces/green-bean/iGreenBean';
import {IBean} from '../../interfaces/bean/iBean';

@Component({
  selector: 'photo-popover',
  templateUrl: './photo-popover.component.html',
  styleUrls: ['./photo-popover.component.scss'],
})
export class PhotoPopoverComponent implements OnInit {


  public data: IBrew | IBean | IGreenBean;

  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               private readonly uiAnalytics: UIAnalytics) {

  }

  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent('PHOTO', 'VIEW');
    this.data = this.navParams.get('data');

  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'photo-popover');
  }


  public ngOnInit() {}


}
