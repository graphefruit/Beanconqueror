import {ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild} from '@angular/core';
import {UIAlert} from '../../services/uiAlert';
import {Preparation} from '../../classes/preparation/preparation';
import {UIPreparationStorage} from '../../services/uiPreparationStorage';
import {ModalController} from '@ionic/angular';
import {UIBrewStorage} from '../../services/uiBrewStorage';
import {PREPARATION_ACTION} from '../../enums/preparations/preparationAction';
import {UISettingsStorage} from '../../services/uiSettingsStorage';
import {Settings} from '../../classes/settings/settings';
import {UIToast} from '../../services/uiToast';
import {UIAnalytics} from '../../services/uiAnalytics';
import {UIPreparationHelper} from '../../services/uiPreparationHelper';
import {AgVirtualSrollComponent} from 'ag-virtual-scroll';


@Component({
  selector: 'preparation',
  templateUrl: './preparation.page.html',
  styleUrls: ['./preparation.page.scss'],
})
export class PreparationPage implements OnInit {
  public settings: Settings;
  public segment: string = 'open';
  public preparations: Array<Preparation> = [];

  public openPreparationsView: Array<Preparation> = [];
  public archivePreparationsView: Array<Preparation> = [];

  @ViewChild('openScroll', {read: AgVirtualSrollComponent, static: false}) public openScroll: AgVirtualSrollComponent;
  @ViewChild('archivedScroll', {read: AgVirtualSrollComponent, static: false}) public archivedScroll: AgVirtualSrollComponent;
  @ViewChild('preparationContent',{read: ElementRef}) public preparationContent: ElementRef;
  constructor(public modalCtrl: ModalController,
              private readonly changeDetectorRef: ChangeDetectorRef,
              private readonly uiPreparationStorage: UIPreparationStorage,
              private readonly uiAlert: UIAlert,
              private readonly uiBrewStorage: UIBrewStorage,
              private readonly uiSettingsStorage: UISettingsStorage,
              private readonly uiToast: UIToast,
              private readonly uiAnalytics: UIAnalytics,
              private readonly uiPreparationHelper: UIPreparationHelper) {

  }

  public ionViewWillEnter(): void {
    this.settings = this.uiSettingsStorage.getSettings();
    this.__initializePreparations();
    this.retriggerScroll();
  }

  public loadPreparations(): void {
    this.__initializePreparations();
    this.changeDetectorRef.detectChanges();
  }

  public segmentChanged() {
    this.retriggerScroll();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(event) {
    this.retriggerScroll();
  }
  private retriggerScroll() {

    setTimeout(async () =>{

      const el =  this.preparationContent.nativeElement;
      let scrollComponent: AgVirtualSrollComponent;
      if (this.openScroll !== undefined) {
        scrollComponent = this.openScroll;
      } else {
        scrollComponent = this.archivedScroll;
      }

      scrollComponent.el.style.height = (el.offsetHeight - scrollComponent.el.offsetTop) + 'px';
    },150);

  }

  public getActivePreparations(): Array<Preparation> {
    return this.openPreparationsView;
  }

  public getArchivedPreparations(): Array<Preparation> {
    return this.archivePreparationsView;
  }

  public async add() {
    await this.uiPreparationHelper.addPreparation();
    this.loadPreparations();
  }

  public async preparationAction(action: PREPARATION_ACTION, preparation: Preparation): Promise<void> {
    this.loadPreparations();
  }



  private __initializePreparations(): void {
    this.openPreparationsView = [];
    this.archivePreparationsView = [];

    this.preparations = this.uiPreparationStorage.getAllEntries()
        .sort((a, b) => a.name.localeCompare(b.name));

    this.openPreparationsView = this.preparations.filter((e) => e.finished === false);
    this.archivePreparationsView = this.preparations.filter((e) => e.finished === true);
  }


  public ngOnInit() {
  }

}
