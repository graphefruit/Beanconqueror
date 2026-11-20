import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
} from '@angular/core';

import {
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  ModalController,
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { BrewInformationComponent } from '../../../components/brew-information/brew-information.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import {
  VirtualListComponent,
  VirtualRowDirective,
} from '../../../components/virtual-list/virtual-list.component';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    VirtualListComponent,
    VirtualRowDirective,
    BrewInformationComponent,
    TranslatePipe,
    IonHeader,
    IonContent,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonIcon,
    IonFooter,
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

  public associatedBrews: Brew[] = [];
  public readonly brewKey = (brew: Brew): string => brew.config.uuid;

  public isCollapsed = false;

  public async ionViewWillEnter() {
    this.uiAnalytics.trackEvent(
      BEAN_TRACKING.TITLE,
      BEAN_TRACKING.ACTIONS.SHOW_BREWS,
    );

    this.loadBrews();
  }

  public async loadBrews() {
    let relatedBrews: Brew[];

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
