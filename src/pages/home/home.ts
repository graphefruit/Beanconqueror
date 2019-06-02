import { Component } from '@angular/core';
import { ModalController, NavController } from 'ionic-angular';

/** Services  */
import { UIStatistic } from '../../services/uiStatistic';

/** Third party */
import moment from 'moment';

import 'moment/locale/de';
import { BrewsAddModal } from '../brews/add/brews-add';

@Component({
  templateUrl: 'home.html',
  selector: 'home-page'
})
export class HomePage {

  /** Needed app minimize for android */
  public isHome: boolean = true;
  public brews: number = 0;
  public beans: number = 0;
  public preparations: number = 0;

  constructor(public navCtrl: NavController, private modalCtrl: ModalController,
              public uiStatistic: UIStatistic) {

  }

  public addBrew(): void {
    const addBrewsModal = this.modalCtrl.create(BrewsAddModal, {});
    addBrewsModal.present({animate: false});
  }

  public isChristmasTime(): boolean {
    const month: number = moment()
      .month() + 1;
    if (month === 12) {
      return true;
    }
    return false;
  }

  public getGeneratedText(): string {

    const year: number = moment()
      .year();
    const month: number = moment()
      .month() + 1;
    // Bug .day always returned 1.
    const day: number  = parseInt(moment()
      .format('DD'), 0);

    // Todo calculate
    return '';
  }

}
