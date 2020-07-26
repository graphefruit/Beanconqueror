import {Component, OnInit} from '@angular/core';
import {ModalController, NavParams} from '@ionic/angular';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {IBean} from '../../../interfaces/bean/iBean';

@Component({
  selector: 'bean-photo-view',
  templateUrl: './bean-photo-view.component.html',
  styleUrls: ['./bean-photo-view.component.scss'],
})
export class BeanPhotoViewComponent implements OnInit {


  public data: IBean;

  constructor(private readonly modalController: ModalController,
              private readonly navParams: NavParams,
              private readonly uiAnalytics: UIAnalytics) {

  }

  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent('BEAN', 'PHOTO_VIEW');
    this.data = this.navParams.get('bean');

  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    });
  }


  public ngOnInit() {
  }

}
