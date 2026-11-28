import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonBadge,
  IonButton,
  IonCard,
  IonCheckbox,
  IonCol,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonRange,
  IonRow,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { create, globeOutline } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';
import { NgxStarsComponent, NgxStarsModule } from 'ngx-stars';

import { RoastingMachine } from '../../../classes/roasting-machine/roasting-machine';
import { Settings } from '../../../classes/settings/settings';
import { BeanDetailSortInformationComponent } from '../../../components/beans/detail/bean-detail-sort-information/bean-detail-sort-information.component';
import { HeaderButtonComponent } from '../../../components/header/header-button.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { PhotoViewComponent } from '../../../components/photo-view/photo-view.component';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { RangeNameDirective } from '../../../directive/range-name.directive';
import { StarsNameDirective } from '../../../directive/stars-name.directive';
import { TabPanelDirective } from '../../../directive/tab-panel.directive';
import { IBean } from '../../../interfaces/bean/iBean';
import { BeanFieldVisiblePipe } from '../../../pipes/bean/beanFieldVisible';
import { FormatDatePipe } from '../../../pipes/formatDate';
import { ToFixedPipe } from '../../../pipes/toFixed';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIHelper } from '../../../services/uiHelper';
import { UIRoastingMachineStorage } from '../../../services/uiRoastingMachineStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import {
  crackTime,
  roastShownAs,
  roastTime,
  roastWeightLoss,
} from '../../../stores/beans/bean-rules';
import { BeanStore, toLegacyBean } from '../../../stores/beans/bean.store';
import { DeepReadonly } from '../../../stores/core/read-only';

@Component({
  selector: 'app-beans-detail',
  templateUrl: './beans-detail.component.html',
  styleUrls: ['./beans-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TabPanelDirective,
    FormsModule,
    NgxStarsModule,
    StarsNameDirective,
    PhotoViewComponent,
    BeanDetailSortInformationComponent,
    TranslatePipe,
    FormatDatePipe,
    ToFixedPipe,
    BeanFieldVisiblePipe,
    HeaderComponent,
    HeaderDismissButtonComponent,
    HeaderButtonComponent,
    IonHeader,
    IonButton,
    IonIcon,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonItem,
    IonRange,
    RangeNameDirective,
    IonBadge,
    IonCheckbox,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class BeansDetailComponent {
  private readonly modalController = inject(ModalController);
  private readonly uiHelper = inject(UIHelper);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly beanStore = inject(BeanStore);
  private readonly roastingMachines = inject(UIRoastingMachineStorage);

  public static readonly COMPONENT_ID: string = 'bean-detail';

  /**
   * The bean to show; legacy callers hand in a `Bean`. Shown is the stored
   * state of the bean with this uuid, or this bean if it is not stored.
   */
  public readonly bean = input.required<DeepReadonly<IBean>>();

  protected readonly settings: Settings =
    inject(UISettingsStorage).getSettings();
  public readonly segment = signal('general');
  protected readonly customRatingRange =
    this.settings.bean_rating !== 5 || this.settings.bean_rating_steps !== 1;

  protected readonly shown = computed(
    () => this.beanStore.byUuid().get(this.bean().config.uuid) ?? this.bean(),
  );
  protected readonly roastTab = computed(
    () => this.shown().bean_roast_information?.bean_uuid !== '',
  );
  protected readonly roast = computed(() => roastShownAs(this.shown()));
  protected readonly roastLength = computed(() =>
    roastTime(this.shown().bean_roast_information?.roast_length),
  );
  protected readonly firstCrack = computed(() =>
    crackTime(this.shown().bean_roast_information?.first_crack_minute),
  );
  protected readonly secondCrack = computed(() =>
    crackTime(this.shown().bean_roast_information?.second_crack_minute),
  );
  protected readonly weightLoss = computed(() =>
    roastWeightLoss(
      this.shown().bean_roast_information?.green_bean_weight,
      this.shown().weight,
    ),
  );
  protected readonly roastingMachineName = computed(() => {
    const machine = new RoastingMachine();
    machine.initializeByObject(
      this.roastingMachines.getByUUID(
        this.shown().bean_roast_information?.roaster_machine,
      ),
    );
    return machine.name;
  });
  /** The photo view takes a legacy bean. */
  protected readonly photoBean = computed(() => toLegacyBean(this.shown()));

  private readonly beanStars = viewChild('beanStars', {
    read: NgxStarsComponent,
  });
  private readonly beanRating = viewChild('beanRating', {
    read: NgxStarsComponent,
  });

  constructor() {
    addIcons({ create, globeOutline });
    // The stars take their input only when they are created.
    effect(() => {
      const bean = this.shown();
      this.beanStars()?.setRating(bean.roast_range);
      this.beanRating()?.setRating(bean.rating);
    });
  }

  public ionViewDidEnter() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.DETAIL,
    );
  }

  public async edit() {
    await this.uiBeanHelper.editBean(toLegacyBean(this.shown()));
  }

  public dismiss(): void {
    void this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BeansDetailComponent.COMPONENT_ID,
    );
  }

  public openURL() {
    const url = this.shown().url;
    if (url) {
      this.uiHelper.openExternalWebpage(url);
    }
  }
}
