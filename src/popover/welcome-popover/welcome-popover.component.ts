import {Component, OnInit, ViewChild} from '@angular/core';
import {IonSlides, ModalController} from '@ionic/angular';
import {BeansAddComponent} from '../../app/beans/beans-add/beans-add.component';
import {PreparationAddComponent} from '../../app/preparation/preparation-add/preparation-add.component';
import {MillAddComponent} from '../../app/mill/mill-add/mill-add.component';
import {UIAnalytics} from '../../services/uiAnalytics';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {Settings} from '../../classes/settings/settings';

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

  public slide: number = 1;
  @ViewChild('slider', {static: false}) public welcomeSlider: IonSlides;


  private readonly settings: Settings;


  constructor(private readonly modalController: ModalController,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiSettingsStorage: UISettingsStorage) {
    this.settings = this.uiSettingsStorage.getSettings();


  }

  public ngOnInit() {
  }

  public async activeGoogleAnalytics(_active: boolean) {
    this.settings.analytics = _active;
    this.uiSettingsStorage.saveSettings(this.settings);
    if (_active) {
      await this.uiAnalytics.enableTracking();
    } else {
      await this.uiAnalytics.disableTracking();
    }
    this.slide++;
    this.welcomeSlider.slideNext();
  }

  public skip() {
    this.slide++;
    this.welcomeSlider.slideNext();
  }

  public next() {
    this.slide++;
    this.welcomeSlider.slideNext();
  }

  public async addBean() {
    const modal = await this.modalController.create({component: BeansAddComponent, id:'bean-add',
      componentProps: {hide_toast_message: true}});
    await modal.present();
    await modal.onWillDismiss();
    this.next();
  }

  public async addPreparation() {
    const modal = await this.modalController.create({
      component: PreparationAddComponent,
      showBackdrop: true, id: 'preparation-add', componentProps: {hide_toast_message: true}
    });
    await modal.present();
    await modal.onWillDismiss();
    this.next();
  }

  public async addMill() {
    const modal = await this.modalController.create({
      component: MillAddComponent,
      cssClass: 'half-bottom-modal', id:'mill-add', showBackdrop: true, componentProps: {hide_toast_message: true}
    });
    await modal.present();
    await modal.onWillDismiss();
    this.next();

  }

  public finish() {
    this.modalController.dismiss({
      dismissed: true
    }, undefined, 'welcome-popover');
    this.settings.welcome_page_showed = true;
    this.uiSettingsStorage.saveSettings(this.settings);

  }


}
