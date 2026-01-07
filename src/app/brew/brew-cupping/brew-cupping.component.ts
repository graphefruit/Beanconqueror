import { Component, Input, ViewChild, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';
import { Brew } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';
import { IBrew } from '../../../interfaces/brew/iBrew';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

import { UIToast } from '../../../services/uiToast';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { CuppingRadarComponent } from '../../../components/cupping-radar/cupping-radar.component';
import { BrewFlavorPickerComponent } from '../brew-flavor-picker/brew-flavor-picker.component';
import BREW_TRACKING from '../../../data/tracking/brewTracking';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { IBean } from '../../../interfaces/bean/iBean';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { Bean } from '../../../classes/bean/bean';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { FormsModule } from '@angular/forms';
import { KeyValuePipe } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { addOutline, trashOutline } from 'ionicons/icons';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonItem,
  IonFooter,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';

@Component({
  selector: 'brew-cupping',
  templateUrl: './brew-cupping.component.html',
  styleUrls: ['./brew-cupping.component.scss'],
  imports: [
    FormsModule,
    CuppingRadarComponent,
    KeyValuePipe,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonItem,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class BrewCuppingComponent {
  private readonly modalController = inject(ModalController);
  uiHelper = inject(UIHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiBeanStorage = inject(UIBeanStorage);

  public static readonly COMPONENT_ID = 'brew-cup';
  public segment: string = 'flavor';

  public data: Bean | Brew = undefined;

  public settings: Settings;

  @ViewChild('radar', { static: false }) public radar: CuppingRadarComponent;
  @Input('brew') public brew: IBrew;
  @Input('bean') public bean: IBean;

  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();

    // Moved from ionViewDidEnter, because of Ionic issues with ion-range
    addIcons({ addOutline, trashOutline });
  }

  public segmentChanged() {
    // Timeout else the viewchilds are not ready.
    setTimeout(() => {
      if (this.segment === 'cupping') {
        this.loadCupping();
      }
    }, 50);
  }
  public saveCuppingValues() {
    this.data.cupping = this.radar.getCuppingValues();
  }

  public loadCupping() {
    this.radar.setCuppingValues(this.data.cupping);
  }

  public deleteCustomFlavor(_index) {
    this.data.cupped_flavor.custom_flavors.splice(_index, 1);
  }
  public deletePredefinedFlavor(_key) {
    delete this.data.cupped_flavor.predefined_flavors[_key];
  }

  public async tasteFlavors() {
    const modal = await this.modalController.create({
      component: BrewFlavorPickerComponent,
      id: BrewFlavorPickerComponent.COMPONENT_ID,
      componentProps: { flavor: this.data.cupped_flavor },
    });
    await modal.present();
    const { data } = await modal.onWillDismiss();
    if (data !== undefined && data.hasOwnProperty('customFlavors')) {
      this.data.cupped_flavor.custom_flavors = data.customFlavors;
      this.data.cupped_flavor.predefined_flavors = data.selectedFlavors;
    }
  }

  public ionViewWillEnter() {
    if (this.brew) {
      this.uiAnalytics.trackEvent(
        BREW_TRACKING.TITLE,
        BREW_TRACKING.ACTIONS.CUPPING,
      );
      this.data = new Brew();
      const copy: IBrew = this.uiHelper.cloneData(
        this.uiBrewStorage.getByUUID(this.brew.config.uuid),
      );
      this.data.initializeByObject(copy);
    } else {
      this.uiAnalytics.trackEvent(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.CUPPING,
      );
      this.data = new Bean();
      const copyBean: IBean = this.uiHelper.cloneData(
        this.uiBeanStorage.getByUUID(this.bean.config.uuid),
      );
      this.data.initializeByObject(copyBean);
    }
  }

  public async updateBrew() {
    if (this.data instanceof Brew) {
      await this.uiBrewStorage.update(this.data);
    } else {
      await this.uiBeanStorage.update(this.data);
    }

    this.uiToast.showInfoToast('TOAST_BREW_EDITED_SUCCESSFULLY');
    this.dismiss();
  }

  public async dismiss() {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewCuppingComponent.COMPONENT_ID,
    );
  }
}
