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

@Component({
  selector: 'app-bean-popover-list',
  templateUrl: './bean-popover-list.component.html',
  styleUrls: ['./bean-popover-list.component.scss'],
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
export class BeanPopoverListComponent {
  private readonly modalController = inject(ModalController);

  public static readonly COMPONENT_ID = 'bean-popover-list';

  @Input() public beansList: Array<Bean> = undefined;

  public readonly beanKey = (bean: Bean): string => bean.config.uuid;

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BeanPopoverListComponent.COMPONENT_ID,
    );
  }
}
