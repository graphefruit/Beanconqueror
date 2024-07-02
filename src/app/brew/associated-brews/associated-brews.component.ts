import {
  Component,
  ElementRef,
  HostListener,
  Input,
  ViewChild,
} from '@angular/core';
import { Bean } from '../../../classes/bean/bean';
import { ModalController } from '@ionic/angular';
import { UIAnalytics } from '../../../services/uiAnalytics';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { Brew } from '../../../classes/brew/brew';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UIMillHelper } from '../../../services/uiMillHelper';
import { AgVirtualSrollComponent } from 'ag-virtual-scroll';

@Component({
  selector: 'app-bean-associated-brews',
  templateUrl: './associated-brews.component.html',
  styleUrls: ['./associated-brews.component.scss'],
})
export class AssociatedBrewsComponent {
  public static readonly COMPONENT_ID = 'associated-brews';
  public data: Bean = new Bean();

  @Input() private readonly uuid: string;
  @Input() private readonly type: string;

  public associatedBrews: Array<Brew> = [];

  @ViewChild('openScroll', { read: AgVirtualSrollComponent, static: false })
  public openScroll: AgVirtualSrollComponent;

  @ViewChild('brewContent', { read: ElementRef })
  public brewContent: ElementRef;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiAnalytics: UIAnalytics,
    private readonly uiPreparationHelper: UIPreparationHelper,
    private readonly uiMillHelper: UIMillHelper
  ) {}

  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.SHOW_BREWS
    );

    this.loadBrews();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(_event: any) {
    this.retriggerScroll();
  }

  private retriggerScroll() {
    setTimeout(async () => {
      const el = this.brewContent.nativeElement;
      let scrollComponent: AgVirtualSrollComponent;
      scrollComponent = this.openScroll;
      scrollComponent.el.style.height =
        el.offsetHeight - scrollComponent.el.offsetTop + 'px';
    }, 150);
  }

  public loadBrews() {
    let relatedBrews: Array<Brew>;

    if (this.type === 'preparation') {
      relatedBrews = this.uiPreparationHelper.getAllBrewsForThisPreparation(
        this.uuid
      );
    } else if (this.type === 'mill') {
      relatedBrews = this.uiMillHelper.getAllBrewsForThisMill(this.uuid);
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
      AssociatedBrewsComponent.COMPONENT_ID
    );
  }
}
