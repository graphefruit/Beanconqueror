import {Component, OnInit, ViewChild} from '@angular/core';
import {IonSlides, ModalController, Platform} from '@ionic/angular';
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

  private disableHardwareBack;
  constructor(private readonly modalController: ModalController,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly platform: Platform) {
    this.settings = this.uiSettingsStorage.getSettings();


  }

  public ngOnInit() {
    try {
      this.disableHardwareBack = this.platform.backButton.subscribeWithPriority(9999, (processNextHandler) => {
        // Don't do anything.
      });
    }catch (ex) {

    }

  }

  public async understoodAnalytics() {
    this.settings.matomo_analytics = true;
    this.uiAnalytics.enableTracking();
    this.uiSettingsStorage.saveSettings(this.settings);
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
    try{
      this.disableHardwareBack.unsubscribe();
    } catch(ex) {

    }

    this.modalController.dismiss({
      dismissed: true
    }, undefined, 'welcome-popover');
    this.settings.welcome_page_showed = true;
    this.uiSettingsStorage.saveSettings(this.settings);

  }


}
