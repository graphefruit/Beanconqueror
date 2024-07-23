import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { AgVirtualSrollComponent } from 'ag-virtual-scroll';
import { ModalController } from '@ionic/angular';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBrewHelper } from '../../../services/uiBrewHelper';

@Component({
  selector: 'app-bean-popover-frozen-list',
  templateUrl: './bean-popover-frozen-list.component.html',
  styleUrls: ['./bean-popover-frozen-list.component.scss'],
})
export class BeanPopoverFrozenListComponent {
  public static readonly COMPONENT_ID = 'bean-popover-frozen-list';

  @Input() public frozenBeansList: Array<Bean> = undefined;

  @ViewChild('openScroll', { read: AgVirtualSrollComponent, static: false })
  public openScroll: AgVirtualSrollComponent;

  @ViewChild('beanContent', { read: ElementRef })
  public beanContent: ElementRef;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiBeanHelper: UIBeanHelper
  ) {}

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
      BeanPopoverFrozenListComponent.COMPONENT_ID
    );
  }
}
