import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import {
  IonBackButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add } from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { Mill } from '../../classes/mill/mill';
import { Settings } from '../../classes/settings/settings';
import { HeaderComponent } from '../../components/header/header.component';
import { MillInformationCardComponent } from '../../components/mill-information-card/mill-information-card.component';
import {
  VirtualListComponent,
  VirtualRowDirective,
} from '../../components/virtual-list/virtual-list.component';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    FormsModule,
    VirtualListComponent,
    VirtualRowDirective,
    MillInformationCardComponent,
    TranslatePipe,
    HeaderComponent,
    IonHeader,
    IonBackButton,
    IonContent,
    IonFab,
    IonFabButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
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

  public mills: Mill[] = [];

  public openMillsView: Mill[] = [];
  public archiveMillsView: Mill[] = [];

  private readonly list =
    viewChild<VirtualListComponent<Mill>>(VirtualListComponent);
  public readonly millKey = (mill: Mill): string => mill.config.uuid;

  public settings: Settings;
  public segment = 'open';

  public constructor() {
    addIcons({ add });
    this.uiBrewStorage
      .attachOnEvent()
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.loadMills());
  }

  public ngOnInit(): void {}

  public segmentChanged() {
    this.list()?.scrollToTop();
  }

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.__initializeMills();
  }

  public getActiveMills(): Mill[] {
    return this.openMillsView;
  }

  public getArchivedMills(): Mill[] {
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
