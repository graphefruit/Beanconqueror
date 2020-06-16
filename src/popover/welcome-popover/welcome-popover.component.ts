import {Component, OnInit, ViewChild} from '@angular/core';
import {IonSlides, ModalController} from '@ionic/angular';
import {BeansAddComponent} from '../../app/beans/beans-add/beans-add.component';
import {PreparationAddComponent} from '../../app/preparation/preparation-add/preparation-add.component';
import {MillAddComponent} from '../../app/mill/mill-add/mill-add.component';

@Component({
  selector: 'welcome-popover',
  templateUrl: './welcome-popover.component.html',
  styleUrls: ['./welcome-popover.component.scss'],
})
export class WelcomePopoverComponent implements OnInit {


  public slideOpts = {
    allowTouchMove: false,
    speed: 400,
    slide: 4,
  };

  @ViewChild('slider', {static: false}) public welcomeSlider: IonSlides;


  constructor(private readonly modalController: ModalController) {
  }

  public ngOnInit() {
  }

  public activeGoogleAnalytics(_active: boolean) {
    this.welcomeSlider.slideNext();
  }

  public skip() {
    this.welcomeSlider.slideNext();
  }

  public async addBean() {

    const modal = await this.modalController.create({component: BeansAddComponent});
    await modal.present();
    await modal.onWillDismiss();
  }

  public async addPreparation() {
    const modal = await this.modalController.create({component: PreparationAddComponent, cssClass: 'bottom-modal', showBackdrop: true});
    await modal.present();
    await modal.onWillDismiss();
  }

  public async addMill() {
    const modal = await this.modalController.create({component: MillAddComponent, cssClass: 'half-bottom-modal', showBackdrop: true});
    await modal.present();
    await modal.onWillDismiss();
  }

  public finish() {
    this.modalController.dismiss({
      dismissed: true
    });

  }


}
