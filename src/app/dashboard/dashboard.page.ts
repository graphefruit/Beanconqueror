import {ChangeDetectorRef, Component, OnInit} from '@angular/core';
import {UIStatistic} from '../../services/uiStatistic';
import {BrewAddComponent} from '../brew/brew-add/brew-add.component';
import {ModalController} from '@ionic/angular';
import {Brew} from '../../classes/brew/brew';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {UIBrewHelper} from '../../services/uiBrewHelper';
import {BrewDetailComponent} from '../brew/brew-detail/brew-detail.component';
import {BREW_ACTION} from '../../enums/brews/brewAction';
import {BrewCuppingComponent} from '../brew/brew-cupping/brew-cupping.component';
import {BrewPhotoViewComponent} from '../brew/brew-photo-view/brew-photo-view.component';
import {BrewEditComponent} from '../brew/brew-edit/brew-edit.component';
import {UIAlert} from '../../services/uiAlert';
import {UIToast} from '../../services/uiToast';
import {Router} from '@angular/router';
import {UIHelper} from '../../services/uiHelper';

@Component({
  selector: 'dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {

  public brews: Array<Brew> = [];
  constructor(public uiStatistic: UIStatistic,
              private readonly modalCtrl: ModalController,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiBrewHelper: UIBrewHelper,
              private readonly uiAlert: UIAlert,
              private readonly uiToast: UIToast,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly router: Router,
              private readonly uiHelper: UIHelper) {
  }

  public ngOnInit(): void {
  }


  public ionViewWillEnter() {
    this.loadBrews();
  }

  public loadBrews() {
    this.brews = this.uiBrewStorage.getAllEntries().filter((e) =>
      e.getBean().finished === false &&
      e.getMill().finished === false &&
      e.getPreparation().finished === false
    );
    this.brews = this.__sortBrews(this.brews);
    this.brews = this.brews.slice(0, 10);
    this.changeDetectorRef.detectChanges();
  }

  public async addBrew() {
    if (this.uiBrewHelper.canBrewIfNotShowMessage()) {
      const modal = await this.modalCtrl.create({component: BrewAddComponent, id:'brew-add'});
      await modal.present();
      await modal.onWillDismiss();
      this.loadBrews();
      this.router.navigate(['/home/brews']);
    }
  }

  public getBrews() {
    return this.brews;
  }


  private __sortBrews(_sortingBrews: Array<Brew>): Array<Brew> {
    const sortedBrews: Array<Brew> = _sortingBrews.sort((obj1, obj2) => {
      if (obj1.config.unix_timestamp < obj2.config.unix_timestamp) {
        return 1;
      }
      if (obj1.config.unix_timestamp > obj2.config.unix_timestamp) {
        return -1;
      }

      return 0;
    });
    return sortedBrews;
  }

  public async brewAction(action: BREW_ACTION, brew: Brew): Promise<void> {
    switch (action) {
      case BREW_ACTION.REPEAT:
        this.repeatBrew(brew);
        break;
      case BREW_ACTION.DETAIL:
        this.detailBrew(brew);
        break;
      case BREW_ACTION.EDIT:
        this.editBrew(brew);
        break;
      case BREW_ACTION.DELETE:
        this.deleteBrew(brew);
        break;
      case BREW_ACTION.PHOTO_GALLERY:
        this.viewPhotos(brew);
        break;
      case BREW_ACTION.CUPPING:
        this.cupBrew(brew);
        break;
      case BREW_ACTION.SHOW_MAP_COORDINATES:
        this.showMapCoordinates(brew);
        break;
      default:
        break;
    }
  }

  public async editBrew(_brew: Brew) {

    const modal = await this.modalCtrl.create({component: BrewEditComponent, id:'brew-edit', componentProps: {brew: _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }

  public async repeatBrew(_brew: Brew) {
    const modal = await this.modalCtrl.create({component: BrewAddComponent, id:'brew-add', componentProps: {brew_template: _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }


  public async add() {
    if (this.uiBrewHelper.canBrewIfNotShowMessage()) {
      const modal = await this.modalCtrl.create({component: BrewAddComponent, id:'brew-add'});
      await modal.present();
      await modal.onWillDismiss();
      this.loadBrews();
    }

  }

  public async detailBrew(_brew: Brew) {
    const modal = await this.modalCtrl.create({component: BrewDetailComponent, id:'brew-detail', componentProps: {brew: _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }

  public async cupBrew(_brew: Brew) {
    const modal = await this.modalCtrl.create({component: BrewCuppingComponent, id:'brew-cup', componentProps: {brew: _brew}});
    await modal.present();
    await modal.onWillDismiss();
    this.loadBrews();
  }


  public async viewPhotos(_brew: Brew) {
    const modal = await this.modalCtrl.create({component: BrewPhotoViewComponent, id:'brew-photo', componentProps: {brew: _brew}});
    await modal.present();
    await modal.onWillDismiss();
  }

  public async showMapCoordinates(_brew: Brew) {
    this.uiHelper.openExternalWebpage(_brew.getCoordinateMapLink());
  }

  public deleteBrew(_brew: Brew): void {
    this.uiAlert.showConfirm('DELETE_BREW_QUESTION', 'SURE_QUESTION', true).then(() => {
        // Yes
        this.__deleteBrew(_brew);
        this.uiToast.showInfoToast('TOAST_BREW_DELETED_SUCCESSFULLY');
      },
      () => {
        // No
      });
  }

  private __deleteBrew(_brew: Brew): void {
    this.uiBrewStorage.removeByObject(_brew);
    this.loadBrews();

  }

}
