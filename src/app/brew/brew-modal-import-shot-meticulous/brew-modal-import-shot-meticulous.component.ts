import {
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonButton,
  IonCard,
  IonCol,
  IonContent,
  IonFooter,
  IonGrid,
  IonHeader,
  IonItem,
  IonRadio,
  IonRadioGroup,
  IonRow,
  ModalController,
} from '@ionic/angular/standalone';

import { HistoryListingEntry } from '@meticulous-home/espresso-api/dist/types';
import { TranslatePipe } from '@ngx-translate/core';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';

import { MeticulousDevice } from '../../../classes/preparationDevice/meticulous/meticulousDevice';
import { GraphDisplayCardComponent } from '../../../components/graph-display-card/graph-display-card.component';
import { HeaderDismissButtonComponent } from '../../../components/header/header-dismiss-button.component';
import { HeaderComponent } from '../../../components/header/header.component';
import { UIAlert } from '../../../services/uiAlert';
import { UIHelper } from '../../../services/uiHelper';

@Component({
  selector: 'app-brew-modal-import-shot-meticulous',
  templateUrl: './brew-modal-import-shot-meticulous.component.html',
  styleUrls: ['./brew-modal-import-shot-meticulous.component.scss'],
  imports: [
    FormsModule,
    AgVirtualScrollComponent,
    GraphDisplayCardComponent,
    TranslatePipe,
    IonHeader,
    IonContent,
    IonButton,
    HeaderComponent,
    HeaderDismissButtonComponent,
    IonRadioGroup,
    IonCard,
    IonItem,
    IonRadio,
    IonGrid,
    IonFooter,
    IonRow,
    IonCol,
  ],
})
export class BrewModalImportShotMeticulousComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  readonly uiHelper = inject(UIHelper);
  private readonly uiAlert = inject(UIAlert);

  public static COMPONENT_ID: string = 'brew-modal-import-shot-meticulous';

  @Input() public meticulousDevice: MeticulousDevice;
  public radioSelection: string;
  public history: Array<HistoryListingEntry> = [];

  @ViewChild('ionItemEl', { read: ElementRef, static: false })
  public ionItemEl: ElementRef;

  @ViewChild('historyShotContent', { read: ElementRef })
  public historyShotContent: ElementRef;

  @ViewChild('shotDataScroll', {
    read: AgVirtualScrollComponent,
    static: false,
  })
  public shotDataScroll: AgVirtualScrollComponent;

  @ViewChild('footerContent', { read: ElementRef })
  public footerContent: ElementRef;
  public segmentScrollHeight: string = undefined;

  public ngOnInit() {
    this.readHistory();
  }

  private async readHistory() {
    await this.uiAlert.showLoadingSpinner();
    this.history = await this.meticulousDevice?.getHistory();
    await this.uiAlert.hideLoadingSpinner();
    this.retriggerScroll();
  }
  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    this.retriggerScroll();
  }

  private retriggerScroll() {
    setTimeout(() => {
      const el = this.historyShotContent.nativeElement;
      const scrollComponent: AgVirtualScrollComponent = this.shotDataScroll;

      if (!scrollComponent) {
        return;
      }

      scrollComponent.el.style.height = el.offsetHeight - 20 + 'px';
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
    }, 150);
  }

  public getElementOffsetWidth() {
    if (this.ionItemEl?.nativeElement?.offsetWidth) {
      return this.ionItemEl?.nativeElement?.offsetWidth - 50;
    }
    return 0;
  }

  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewModalImportShotMeticulousComponent.COMPONENT_ID,
    );
  }
  public choose(): void {
    let returningData;

    for (const entry of this.history) {
      if (entry.id === this.radioSelection) {
        returningData = entry;
        break;
      }
    }
    this.modalController.dismiss(
      {
        choosenHistory: returningData,
        dismissed: true,
      },
      undefined,
      BrewModalImportShotMeticulousComponent.COMPONENT_ID,
    );
  }
}
