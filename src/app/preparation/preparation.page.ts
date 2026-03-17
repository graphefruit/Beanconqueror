import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonMenuButton,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';

import { Preparation } from '../../classes/preparation/preparation';
import { Settings } from '../../classes/settings/settings';
import { HeaderButtonComponent } from '../../components/header/header-button.component';
import { HeaderComponent } from '../../components/header/header.component';
import { PreparationInformationCardComponent } from '../../components/preparation-information-card/preparation-information-card.component';
import { PREPARATION_ACTION } from '../../enums/preparations/preparationAction';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIPreparationHelper } from '../../services/uiPreparationHelper';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIToast } from '../../services/uiToast';

@Component({
  selector: 'preparation',
  templateUrl: './preparation.page.html',
  styleUrls: ['./preparation.page.scss'],
  imports: [
    FormsModule,
    AgVirtualScrollComponent,
    PreparationInformationCardComponent,
    TranslatePipe,
    HeaderComponent,
    HeaderButtonComponent,
    IonHeader,
    IonMenuButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
  ],
})
export class PreparationPage implements OnInit {
  modalCtrl = inject(ModalController);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiToast = inject(UIToast);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiPreparationHelper = inject(UIPreparationHelper);

  public settings: Settings;
  public segment = 'open';
  public preparations: Preparation[] = [];

  public openPreparationsView: Preparation[] = [];
  public archivePreparationsView: Preparation[] = [];

  @ViewChild('openScroll', { read: AgVirtualScrollComponent, static: false })
  public openScroll: AgVirtualScrollComponent;
  @ViewChild('archivedScroll', {
    read: AgVirtualScrollComponent,
    static: false,
  })
  public archivedScroll: AgVirtualScrollComponent;
  @ViewChild('preparationContent', { read: ElementRef })
  public preparationContent: ElementRef;
  public segmentScrollHeight: string = undefined;

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.__initializePreparations();
    this.retriggerScroll();
    this.uiBrewStorage.attachOnEvent().subscribe((_val) => {
      this.loadPreparations();
    });
  }

  public loadPreparations(): void {
    this.__initializePreparations();
    this.changeDetectorRef.detectChanges();
  }

  public segmentChanged() {
    this.retriggerScroll();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange')
  public onOrientationChange() {
    this.retriggerScroll();
  }
  private retriggerScroll() {
    setTimeout(() => {
      const el = this.preparationContent.nativeElement;
      let scrollComponent: AgVirtualScrollComponent;
      if (this.openScroll !== undefined) {
        scrollComponent = this.openScroll;
      } else {
        scrollComponent = this.archivedScroll;
      }

      scrollComponent.el.style.height =
        el.offsetHeight - scrollComponent.el.offsetTop + 'px';

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

  public async add() {
    await this.uiPreparationHelper.addPreparation();
    this.loadPreparations();
  }

  public async preparationAction(
    action: PREPARATION_ACTION,
    preparation: Preparation,
  ): Promise<void> {
    this.loadPreparations();
  }

  private __initializePreparations(): void {
    this.openPreparationsView = [];
    this.archivePreparationsView = [];

    this.preparations = this.uiPreparationStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));

    this.openPreparationsView = this.preparations.filter(
      (e) => e.finished === false,
    );
    this.archivePreparationsView = this.preparations.filter(
      (e) => e.finished === true,
    );
  }

  public ngOnInit() {}
}

export default PreparationPage;
