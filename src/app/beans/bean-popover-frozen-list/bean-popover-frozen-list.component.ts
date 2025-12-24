import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Bean } from '../../../classes/bean/bean';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';
import { ModalController } from '@ionic/angular';
import { UIBeanHelper } from '../../../services/uiBeanHelper';

@Component({
  selector: 'app-bean-popover-frozen-list',
  templateUrl: './bean-popover-frozen-list.component.html',
  styleUrls: ['./bean-popover-frozen-list.component.scss'],
  standalone: false,
})
export class BeanPopoverFrozenListComponent {
  public static readonly COMPONENT_ID = 'bean-popover-frozen-list';

  @Input() public frozenBeansList: Array<Bean> = undefined;

  @ViewChild('openScroll', { read: AgVirtualScrollComponent, static: false })
  public openScroll: AgVirtualScrollComponent;

  @ViewChild('beanContent', { read: ElementRef })
  public beanContent: ElementRef;
  public segmentScrollHeight: string = undefined;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiBeanHelper: UIBeanHelper,
  ) {}

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
      BeanPopoverFrozenListComponent.COMPONENT_ID,
    );
  }
}
