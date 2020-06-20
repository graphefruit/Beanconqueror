import {Component} from '@angular/core';
import {ModalController, NavController} from '@ionic/angular';
import {UIStatistic} from '../../services/uiStatistic';
import moment from 'moment';
import {BrewAddComponent} from '../brew/brew-add/brew-add.component';
import {Router} from '@angular/router';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {Bean} from '../../classes/bean/bean';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {Preparation} from '../../classes/preparation/preparation';
import {UIMillStorage} from '../../services/uiMillStorage';
import {Mill} from '../../classes/mill/mill';

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
               public uiStatistic: UIStatistic,
               private readonly router: Router,
               private readonly uiBeanStorage: UIBeanStorage,
               private readonly uiPreparationStorage: UIPreparationStorage,
               private readonly uiMillStorage: UIMillStorage) {

  }

  public ionViewDidEnter(): void {

  }


  public async addBrew() {
    const modal = await this.modalCtrl.create({component: BrewAddComponent});
    await modal.present();
    await modal.onWillDismiss();
  }

  public showBeans() {
    this.router.navigate(['/beans']);
  }

  public showBrews() {
    this.router.navigate(['/brew']);
  }


  public showPreparation() {
    this.router.navigate(['/preparation']);
  }

  public showMills() {
    this.router.navigate(['/mill']);
  }

  public showSupporter() {
    this.router.navigate(['/info/thanks']);
  }
  public isChristmasTime(): boolean {
    const month: number = moment().month() + 1;
    if (month === 12) {
      return true;
    }

    return false;
  }

  public activeBeansExists(): boolean {
    const beans: Array<Bean> = this.uiBeanStorage.getAllEntries();
    return beans.filter((e) => e.finished === false).length > 0;
  }

  public activePreparationsExists(): boolean {
    const preparations: Array<Preparation> = this.uiPreparationStorage.getAllEntries();
    return preparations.filter((e) => e.finished === false).length > 0;
  }

  public activeMillsExists(): boolean {
    const mills: Array<Mill> = this.uiMillStorage.getAllEntries();

    return mills.filter((e) => e.finished === false).length > 0;
  }

}
