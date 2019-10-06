import {Component} from '@angular/core';
import {ModalController, NavController} from '@ionic/angular';
import {UIStatistic} from '../../services/uiStatistic';
import * as moment from 'moment';
import {BrewAddComponent} from '../brew/brew-add/brew-add.component';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {


  /** Needed app minimize for android */
  public isHome: boolean = true;
  public brews: number = 0;
  public beans: number = 0;
  public preparations: number = 0;

  constructor (public navCtrl: NavController,
               private readonly modalCtrl: ModalController,
               public uiStatistic: UIStatistic) {

  }

  public async addBrew() {
    const modal = await this.modalCtrl.create({component: BrewAddComponent});
    await modal.present();
    await modal.onWillDismiss();
  }

  public isChristmasTime(): boolean {
    const month: number = moment().month() + 1;
    if (month === 12) {
      return true;
    }

    return false;
  }

}
