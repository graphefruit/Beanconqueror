import {Component, OnInit, ViewChild} from '@angular/core';
import {IonSlides, ModalController} from '@ionic/angular';
import {BeansAddComponent} from '../../app/beans/beans-add/beans-add.component';
import {PreparationAddComponent} from '../../app/preparation/preparation-add/preparation-add.component';
import {MillAddComponent} from '../../app/mill/mill-add/mill-add.component';
import {UIAnalytics} from '../../services/uiAnalytics';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {Settings} from '../../classes/settings/settings';
import {UIBeanStorage} from '../../services/uiBeanStorage';
import {UIMillStorage} from '../../services/uiMillStorage';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';

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


  private settings: Settings;

  constructor(private readonly modalController: ModalController,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiBeanStorage: UIBeanStorage,
              private readonly uiMillStorage: UIMillStorage,
              private readonly uiPreparationStorage: UIPreparationStorage) {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ngOnInit() {
  }

  public async activeGoogleAnalytics(_active: boolean) {
    console.log(_active);
    this.settings.analytics = _active;
    console.log(_active);
    this.uiSettingsStorage.saveSettings(this.settings);
    console.log(_active);
    if (_active) {
      await this.uiAnalytics.enableTracking();
    } else {
      await this.uiAnalytics.disableTracking();
    }

    this.welcomeSlider.slideNext();
  }

  public hasBeans() {
    return this.uiBeanStorage.getAllEntries().length > 0;
  }

  public hasMills() {
    return this.uiMillStorage.getAllEntries().length > 0;
  }

  public hasPreparations() {
    return this.uiPreparationStorage.getAllEntries().length > 0;
  }
  public skip() {
    this.welcomeSlider.slideNext();
  }

  public next() {
    this.welcomeSlider.slideNext();
  }

  public async addBean() {

    const modal = await this.modalController.create({component: BeansAddComponent, componentProps: {hide_toast_message: true}});
    await modal.present();
    await modal.onWillDismiss();
    this.next();
  }

  public async addPreparation() {
    const modal = await this.modalController.create({
      component: PreparationAddComponent,
      cssClass: 'bottom-modal', showBackdrop: true, componentProps: {hide_toast_message: true}
    });
    await modal.present();
    await modal.onWillDismiss();
    this.next();
  }

  public async addMill() {
    const modal = await this.modalController.create({
      component: MillAddComponent,
      cssClass: 'half-bottom-modal', showBackdrop: true, componentProps: {hide_toast_message: true}
    });
    await modal.present();
    await modal.onWillDismiss();
    this.next();

  }

  public finish() {
    this.modalController.dismiss({
      dismissed: true
    });
    this.settings.welcome_page_showed = true;
    this.uiSettingsStorage.saveSettings(this.settings);

  }


}
