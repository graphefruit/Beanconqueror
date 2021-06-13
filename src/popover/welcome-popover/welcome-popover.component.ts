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


  private settings: Settings;

  private disableHardwareBack;
  constructor(private readonly modalController: ModalController,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly platform: Platform) {



  }
  private __triggerUpdate() {
    // Fix, specialy on new devices which will see 2 update screens, the slider was white
    setTimeout(() => {
      this.welcomeSlider.update();
    });
  }
  public ngOnInit() {
    try {
      this.settings = this.uiSettingsStorage.getSettings();
      this.disableHardwareBack = this.platform.backButton.subscribeWithPriority(9999, (processNextHandler) => {
        // Don't do anything.
      });
    }catch (ex) {

    }

  }

  public async understoodAnalytics() {
    this.settings.matomo_analytics = true;
    this.uiAnalytics.enableTracking();
    await this.uiSettingsStorage.saveSettings(this.settings);
    this.slide++;

    this.welcomeSlider.slideNext();
    this.__triggerUpdate();
  }

  public async skip() {

    this.slide++;
    this.welcomeSlider.slideNext();
    this.__triggerUpdate();
  }

  public next() {

    this.slide++;
    this.welcomeSlider.slideNext();
    this.__triggerUpdate();
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
      cssClass: 'popover-actions',
      id:'mill-add',
      componentProps: {hide_toast_message: true}
    });
    await modal.present();
    await modal.onWillDismiss();
    this.next();

  }

  public async finish() {
    try{
      this.disableHardwareBack.unsubscribe();
    } catch(ex) {

    }
    this.settings.welcome_page_showed = true;
    await this.uiSettingsStorage.saveSettings(this.settings);
    this.modalController.dismiss({
      dismissed: true
    }, undefined, 'welcome-popover');


  }


}
