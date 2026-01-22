import {
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnInit,
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
import { BeanInformationComponent } from '../../../components/bean-information/bean-information.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';

@Component({
  selector: 'app-bean-popover-list',
  templateUrl: './bean-popover-list.component.html',
  styleUrls: ['./bean-popover-list.component.scss'],
  imports: [
    AgVirtualScrollComponent,
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

  @ViewChild('openScroll', { read: AgVirtualScrollComponent, static: false })
  public openScroll: AgVirtualScrollComponent;

  @ViewChild('beanContent', { read: ElementRef })
  public beanContent: ElementRef;
  public segmentScrollHeight: string = undefined;

  public async ionViewWillEnter() {
    this.loadBrews();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    this.retriggerScroll();
  }

  private retriggerScroll() {
    setTimeout(async () => {
      const el = this.beanContent.nativeElement;
      let scrollComponent: AgVirtualScrollComponent;
      scrollComponent = this.openScroll;
      scrollComponent.el.style.height =
        el.offsetHeight - scrollComponent.el.offsetTop + 'px';
      this.segmentScrollHeight = scrollComponent.el.style.height;
    }, 150);
  }

  public loadBrews() {
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
      BeanPopoverListComponent.COMPONENT_ID,
    );
  }
}
