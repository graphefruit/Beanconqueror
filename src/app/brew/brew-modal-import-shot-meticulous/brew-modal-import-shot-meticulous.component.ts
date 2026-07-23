import {
  Component,
  ElementRef,
  HostListener,
  inject,
  Input,
  OnDestroy,
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
export class BrewModalImportShotMeticulousComponent
  implements OnInit, OnDestroy
{
  private readonly modalController = inject(ModalController);
  readonly uiHelper = inject(UIHelper);
  private readonly uiAlert = inject(UIAlert);

  public static COMPONENT_ID: string = 'brew-modal-import-shot-meticulous';

  @Input() public meticulousDevice: MeticulousDevice;
  @Input() public profileFilter: string | undefined;
  public radioSelection: string;
  public history: any[] = [];
  public chartWidth = 0;
  public hasMore = true;
  public isLoadingMore = false;
  private isDestroyed = false;
  private lastEntryTime: number | undefined;
  private boundScrollHandler: ((event: Event) => void) | undefined;

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
    void this.readHistory();
  }

  public ngOnDestroy() {
    this.isDestroyed = true;
    if (this.shotDataScroll && this.boundScrollHandler) {
      this.shotDataScroll.el.removeEventListener(
        'scroll',
        this.boundScrollHandler,
      );
    }
  }

  private async readHistory() {
    await this.uiAlert.showLoadingSpinner();
    try {
      const results = await this.meticulousDevice?.getHistory(
        undefined,
        this.profileFilter,
      );
      this.history = results ?? [];
      this.lastEntryTime = this.history[this.history.length - 1]?.time;
      this.hasMore = this.history.length >= MeticulousDevice.PAGE_SIZE;
    } catch (ex) {
      await this.uiAlert.showMessage(
        'PREPARATION_DEVICE.TYPE_METICULOUS.DATA_COULD_NOT_BE_LOADED',
        'ERROR_OCCURED',
        undefined,
        true,
      );
    }
    await this.uiAlert.hideLoadingSpinner();
    this.retriggerScroll();
  }

  public async loadMoreHistory() {
    if (
      !this.hasMore ||
      this.isLoadingMore ||
      this.lastEntryTime === undefined
    ) {
      return;
    }
    this.isLoadingMore = true;
    try {
      /**
       * Search all profiles everytime
       */
      const results = await this.meticulousDevice?.getHistory(
        this.lastEntryTime,
        '',
      );
      const allResults = results ?? [];
      const newEntries = allResults.filter(
        (entry) => !this.history.some((existing) => existing.id === entry.id),
      );
      this.history = [...this.history, ...newEntries];
      this.lastEntryTime = this.history[this.history.length - 1]?.time;
      this.hasMore =
        allResults.length >= MeticulousDevice.PAGE_SIZE &&
        newEntries.length > 0;
    } catch (ex) {
      // silently fail — scroll triggers a retry naturally
    }
    this.isLoadingMore = false;
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

      this.updateChartWidth();
      this.attachScrollListener();
      this.checkAndLoadMoreIfNeeded();
    }, 150);
  }

  private attachScrollListener() {
    if (this.boundScrollHandler || !this.shotDataScroll) {
      return;
    }
    this.boundScrollHandler = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.scrollHeight - target.scrollTop - target.clientHeight < 100) {
        void this.loadMoreHistory();
      }
    };
    this.shotDataScroll.el.addEventListener('scroll', this.boundScrollHandler);
  }

  private checkAndLoadMoreIfNeeded() {
    setTimeout(() => {
      void this.doCheckAndLoadMoreIfNeeded();
    }, 150);
  }

  private async doCheckAndLoadMoreIfNeeded() {
    if (
      this.isDestroyed ||
      !this.shotDataScroll ||
      !this.hasMore ||
      this.isLoadingMore
    ) {
      return;
    }
    const target = this.shotDataScroll.el;
    if (target && target.scrollHeight - target.clientHeight < 100) {
      await this.loadMoreHistory();
      this.checkAndLoadMoreIfNeeded();
    }
  }

  // Cache the chart width into a property rather than binding a layout-reading
  // method in the template. Reading offsetWidth during change detection returns
  // different values before and after layout, which triggers
  // ExpressionChangedAfterItHasBeenCheckedError. This runs inside the
  // retriggerScroll/resize timeouts, i.e. its own change detection cycle.
  private updateChartWidth() {
    const offsetWidth = this.ionItemEl?.nativeElement?.offsetWidth;
    this.chartWidth = offsetWidth ? offsetWidth - 50 : 0;
  }

  public dismiss(): void {
    void this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewModalImportShotMeticulousComponent.COMPONENT_ID,
    );
  }
  public async choose(): Promise<void> {
    let returningData;

    for (const entry of this.history) {
      if (entry.id === this.radioSelection) {
        returningData = entry;
        break;
      }
    }

    // The selected entry's shot data is loaded lazily once its card renders.
    // Guarantee it is present before handing the entry back to the importer.
    if (returningData && !returningData.data) {
      try {
        const details = await this.meticulousDevice?.getHistoryEntryDetails(
          returningData.id,
        );
        if (details?.data) {
          returningData.data = details.data;
        }
      } catch {
        // ignore - importer guards against missing data
      }
    }

    void this.modalController.dismiss(
      {
        choosenHistory: returningData,
        dismissed: true,
      },
      undefined,
      BrewModalImportShotMeticulousComponent.COMPONENT_ID,
    );
  }
}
