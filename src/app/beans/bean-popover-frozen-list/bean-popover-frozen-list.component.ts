import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
} from '@angular/core';

import { IonContent, IonHeader, ModalController } from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { Bean } from '../../../classes/bean/bean';
import { BeanInformationComponent } from '../../../components/bean-information/bean-information.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import {
  VirtualListComponent,
  VirtualRowDirective,
} from '../../../components/virtual-list/virtual-list.component';
import { UIBeanHelper } from '../../../services/uiBeanHelper';

@Component({
  selector: 'app-bean-popover-frozen-list',
  templateUrl: './bean-popover-frozen-list.component.html',
  styleUrls: ['./bean-popover-frozen-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    VirtualListComponent,
    VirtualRowDirective,
    BeanInformationComponent,
    TranslatePipe,
    IonHeader,
    IonContent,
    HeaderComponent,
    HeaderDismissButtonComponent,
  ],
})
export class BeanPopoverFrozenListComponent {
  private readonly modalController = inject(ModalController);
  private readonly uiBeanHelper = inject(UIBeanHelper);

  public static readonly COMPONENT_ID = 'bean-popover-frozen-list';

  @Input() public frozenBeansList: Array<Bean> = undefined;

  public readonly beanKey = (bean: Bean): string => bean.config.uuid;

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BeanPopoverFrozenListComponent.COMPONENT_ID,
    );
  }
}
