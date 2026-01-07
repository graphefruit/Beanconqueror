import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIAlert } from '../../services/uiAlert';
import { Mill } from '../../classes/mill/mill';
import { ModalController } from '@ionic/angular/standalone';
import { UIBrewStorage } from '../../services/uiBrewStorage';

import { MILL_ACTION } from '../../enums/mills/millActions';
import { Settings } from '../../classes/settings/settings';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIMillHelper } from '../../services/uiMillHelper';
import { AgVirtualScrollComponent } from 'ag-virtual-scroll';
import { FormsModule } from '@angular/forms';
import { MillInformationCardComponent } from '../../components/mill-information-card/mill-information-card.component';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonMenuButton,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/angular/standalone';

@Component({
  selector: 'mill',
  templateUrl: './mill.page.html',
  styleUrls: ['./mill.page.scss'],
  imports: [
    FormsModule,
    AgVirtualScrollComponent,
    MillInformationCardComponent,
    TranslatePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonButton,
    IonIcon,
    IonTitle,
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
    setTimeout(async () => {
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
