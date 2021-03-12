import {Component, OnInit, ViewChild} from '@angular/core';
import {IBrew} from '../../interfaces/brew/iBrew';
import {IonSlides, ModalController, NavParams} from '@ionic/angular';
import {UIAnalytics} from '../../services/uiAnalytics';
import {IGreenBean} from '../../interfaces/green-bean/iGreenBean';
import {IBean} from '../../interfaces/bean/iBean';
import {IRoastingMachine} from '../../interfaces/roasting-machine/iRoastingMachine';

@Component({
  selector: 'photo-popover',
  templateUrl: './photo-popover.component.html',
  styleUrls: ['./photo-popover.component.scss'],
})
export class PhotoPopoverComponent implements OnInit {


  public data: IBrew | IBean | IGreenBean |IRoastingMachine;
  @ViewChild('photoSlides', {static: false}) public photoSlides: IonSlides;
  constructor (private readonly modalController: ModalController,
               private readonly navParams: NavParams,
               private readonly uiAnalytics: UIAnalytics) {

  }
  private async updateSlider() {
    if (this.photoSlides) {
      await this.photoSlides.update();
    }

  }
  public ionViewDidEnter(): void {
    this.uiAnalytics.trackEvent('PHOTO', 'VIEW');
    this.data = this.navParams.get('data');
    this.updateSlider();

  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'photo-popover');
  }


  public ngOnInit() {}


}
