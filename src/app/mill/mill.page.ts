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
  IonLabel,
  IonMenuButton,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';

import { Mill } from '../../classes/mill/mill';
import { Settings } from '../../classes/settings/settings';
import { HeaderButtonComponent } from '../../components/header/header-button.component';
import { HeaderComponent } from '../../components/header/header.component';
import { MillInformationCardComponent } from '../../components/mill-information-card/mill-information-card.component';
import { MILL_ACTION } from '../../enums/mills/millActions';
import { UIAlert } from '../../services/uiAlert';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIBrewStorage } from '../../services/uiBrewStorage';
import { UIMillHelper } from '../../services/uiMillHelper';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';

@Component({
  selector: 'mill',
  templateUrl: './mill.page.html',
  styleUrls: ['./mill.page.scss'],
  imports: [
    FormsModule,
    AgVirtualScrollComponent,
    MillInformationCardComponent,
    TranslatePipe,
    HeaderComponent,
    HeaderButtonComponent,
    IonHeader,
    IonMenuButton,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
  ],
})
export class MillPage implements OnInit {
  modalCtrl = inject(ModalController);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiBrewStorage = inject(UIBrewStorage);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiMillHelper = inject(UIMillHelper);

  public mills: Array<Mill> = [];

  public openMillsView: Array<Mill> = [];
  public archiveMillsView: Array<Mill> = [];

  @ViewChild('openScroll', { read: AgVirtualScrollComponent, static: false })
  public openScroll: AgVirtualScrollComponent;
  @ViewChild('archivedScroll', {
    read: AgVirtualScrollComponent,
    static: false,
  })
  public archivedScroll: AgVirtualScrollComponent;
  @ViewChild('millContent', { read: ElementRef })
  public millContent: ElementRef;

  public settings: Settings;
  public segment: string = 'open';
  public segmentScrollHeight: string = undefined;

  public ngOnInit(): void {}

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
      const el = this.millContent.nativeElement;
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

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.__initializeMills();
    this.retriggerScroll();

    this.uiBrewStorage.attachOnEvent().subscribe((_val) => {
      this.loadMills();
    });
  }

  public getActiveMills(): Array<Mill> {
    return this.openMillsView;
  }

  public getArchivedMills(): Array<Mill> {
    return this.archiveMillsView;
  }

  public loadMills(): void {
    this.__initializeMills();
    this.changeDetectorRef.detectChanges();
  }

  public async millAction(action: MILL_ACTION, mill: Mill): Promise<void> {
    this.loadMills();
  }

  public async add() {
    await this.uiMillHelper.addMill();
    this.loadMills();
  }

  private __initializeMills(): void {
    this.openMillsView = [];
    this.archiveMillsView = [];
    this.mills = this.uiMillStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));

    this.openMillsView = this.mills.filter((e) => e.finished === false);
    this.archiveMillsView = this.mills.filter((e) => e.finished === true);
  }
}

export default MillPage;
