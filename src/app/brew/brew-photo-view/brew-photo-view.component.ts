import {Component, OnInit} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {IBrew} from '../../../interfaces/brew/iBrew';
import {UIAnalytics} from '../../../services/uiAnalytics';

@Component({
  selector: 'brew-photo-view',
  templateUrl: './brew-photo-view.component.html',
  styleUrls: ['./brew-photo-view.component.scss'],
})
export class BrewPhotoViewComponent implements OnInit {


  public data: IBrew;

  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               private readonly uiAnalytics: UIAnalytics) {

  }

  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent('BREW', 'PHOTO_VIEW');
    this.data = this.navParams.get('brew');

  }

  public dismiss(): void {
    this.modalController.dismiss({
      'dismissed': true
    });
  }


  public ngOnInit() {}

}
