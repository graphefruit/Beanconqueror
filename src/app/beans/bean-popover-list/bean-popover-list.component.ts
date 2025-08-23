import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Bean } from '../../../classes/bean/bean';
import { AgVirtualSrollComponent } from 'ag-virtual-scroll';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-bean-popover-list',
  templateUrl: './bean-popover-list.component.html',
  styleUrls: ['./bean-popover-list.component.scss'],
  standalone: false,
})
export class BeanPopoverListComponent {
  public static readonly COMPONENT_ID = 'bean-popover-list';

  @Input() public beansList: Array<Bean> = undefined;

  @ViewChild('openScroll', { read: AgVirtualSrollComponent, static: false })
  public openScroll: AgVirtualSrollComponent;

  @ViewChild('beanContent', { read: ElementRef })
  public beanContent: ElementRef;
  public segmentScrollHeight: string = undefined;
  constructor(private readonly modalController: ModalController) {}

  public async ionViewWillEnter() {
    this.loadBrews();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(_event: any) {
    this.retriggerScroll();
  }

  private retriggerScroll() {
    setTimeout(async () => {
      const el = this.beanContent.nativeElement;
      let scrollComponent: AgVirtualSrollComponent;
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
