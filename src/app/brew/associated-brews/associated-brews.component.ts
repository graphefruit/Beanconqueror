import {
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
} from '@angular/core';
import { Bean } from '../../../classes/bean/bean';
import { ModalController } from '@ionic/angular/standalone';
import { UIAnalytics } from '../../../services/uiAnalytics';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { Brew } from '../../../classes/brew/brew';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIMillHelper } from '../../../services/uiMillHelper';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';
import { UIAlert } from '../../../services/uiAlert';
import { UIWaterHelper } from '../../../services/uiWaterHelper';
import { BrewInformationComponent } from '../../../components/brew-information/brew-information.component';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-bean-associated-brews',
  templateUrl: './associated-brews.component.html',
  styleUrls: ['./associated-brews.component.scss'],
  imports: [
    AgVirtualScrollComponent,
    BrewInformationComponent,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
  ],
})
export class AssociatedBrewsComponent {
  public static readonly COMPONENT_ID = 'associated-brews';
  public data: Bean = new Bean();

  @Input() private readonly uuid: string;
  @Input() private readonly type: string;

  public associatedBrews: Array<Brew> = [];

  @ViewChild('openScrollAssociatedBrews', {
    read: AgVirtualScrollComponent,
    static: false,
  })
  public openScrollAssociatedBrews: AgVirtualScrollComponent;

  @ViewChild('associatedBrewsComponent', { read: ElementRef })
  public associatedBrewsComponent: ElementRef;
  public segmentScrollHeight: string = undefined;

  public isCollapsed: boolean = false;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly uiMillHelper: UIMillHelper,
    private readonly uiAlert: UIAlert,
    private readonly uiWaterHelper: UIWaterHelper,
  ) {}

  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.SHOW_BREWS,
    );

    this.loadBrews();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    this.retriggerScroll();
  }

  private retriggerScroll() {
    setTimeout(async () => {
      const el = this.associatedBrewsComponent.nativeElement;
      const scrollComponent: AgVirtualScrollComponent =
        this.openScrollAssociatedBrews;

      if (scrollComponent) {
        scrollComponent.el.style.height =
          el.offsetHeight - scrollComponent.el.offsetTop - 20 + 'px';

        this.segmentScrollHeight = scrollComponent.el.style.height;
        setTimeout(() => {
          /** If we wouldn't do it, and the tiles are collapsed, the next once just exist when the user starts scrolling**/
          const elScroll = scrollComponent.el;
          elScroll.dispatchEvent(new Event('scroll'));
        }, 15);
      }
    }, 150);
  }

  public async loadBrews() {
    let relatedBrews: Array<Brew>;

    if (this.type === 'preparation') {
      relatedBrews = this.uiPreparationHelper.getAllBrewsForThisPreparation(
        this.uuid,
      );
    } else if (this.type === 'mill') {
      relatedBrews = this.uiMillHelper.getAllBrewsForThisMill(this.uuid);
    } else if (this.type === 'water') {
      relatedBrews = this.uiWaterHelper.getAllBrewsForThisWater(this.uuid);
    } else {
      relatedBrews = this.uiBeanHelper.getAllBrewsForThisBean(this.uuid);
    }

    this.associatedBrews = UIBrewHelper.sortBrews(relatedBrews);
    this.retriggerScroll();
  }

  public async brewAction(): Promise<void> {
    this.loadBrews();
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      AssociatedBrewsComponent.COMPONENT_ID,
    );
  }
}
