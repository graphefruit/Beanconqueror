import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {IBrew} from '../../interfaces/brew/iBrew';
import {IonSlides, ModalController} from '@ionic/angular';
import {IGreenBean} from '../../interfaces/green-bean/iGreenBean';
import {IBean} from '../../interfaces/bean/iBean';
import {IRoastingMachine} from '../../interfaces/roasting-machine/iRoastingMachine';

@Component({
  selector: 'photo-popover',
  templateUrl: './photo-popover.component.html',
  styleUrls: ['./photo-popover.component.scss'],
})
export class PhotoPopoverComponent implements OnInit {


  @Input() public data: IBrew | IBean | IGreenBean |IRoastingMachine;
  @ViewChild('photoSlides', {static: false}) public photoSlides: IonSlides;
  constructor (private readonly modalController: ModalController) {

  }
  private async updateSlider() {
    if (this.photoSlides) {
      await this.photoSlides.update();
    }

  }
  public ionViewDidEnter(): void {
    this.updateSlider();

  }

  public dismiss(): void {
    this.modalController.dismiss({
      dismissed: true
    },undefined,'photo-popover');
  }


  public ngOnInit() {}


}
