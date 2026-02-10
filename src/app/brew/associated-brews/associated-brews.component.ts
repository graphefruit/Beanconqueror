import {
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  ViewChild,
} from '@angular/core';

import {
  IonContent,
  IonHeader,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';

import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { BrewInformationComponent } from '../../../components/brew-information/brew-information.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIMillHelper } from '../../../services/uiMillHelper';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIWaterHelper } from '../../../services/uiWaterHelper';

@Component({
  selector: 'app-bean-associated-brews',
  templateUrl: './associated-brews.component.html',
  styleUrls: ['./associated-brews.component.scss'],
  imports: [
    AgVirtualScrollComponent,
    BrewInformationComponent,
    TranslatePipe,
    IonHeader,
    IonContent,
    HeaderComponent,
    HeaderDismissButtonComponent,
  ],
})
export class AssociatedBrewsComponent {
  private readonly modalController = inject(ModalController);
  private readonly uiBeanHelper = inject(UIBeanHelper);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);
  private readonly uiMillHelper = inject(UIMillHelper);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiWaterHelper = inject(UIWaterHelper);

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
    setTimeout(() => {
      const el = this.associatedBrewsComponent.nativeElement;
      const scrollComponent: AgVirtualScrollComponent =
        this.openScrollAssociatedBrews;

      if (scrollComponent) {
        scrollComponent.el.style.height =
          el.offsetHeight - scrollComponent.el.offsetTop - 20 + 'px';

        this.segmentScrollHeight = scrollComponent.el.style.height;

        // HACK: Manually trigger component refresh to work around initialization
        //       bug. For some reason the scroll component sees its own height as
        //       0 during initialization, which causes it to render 0 items. As
        //       no changes to the component occur after initialization, no
        //       re-render ever occurs. This forces one. The root cause for
        //       this issue is currently unknown.
        if (scrollComponent.items.length === 0) {
          scrollComponent.refreshData();
        }
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
