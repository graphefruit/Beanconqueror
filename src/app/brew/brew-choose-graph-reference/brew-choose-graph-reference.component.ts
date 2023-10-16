import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { Brew } from '../../../classes/brew/brew';
import { PreparationTool } from '../../../classes/preparation/preparationTool';
import { IBrewPageFilter } from '../../../interfaces/brew/iBrewPageFilter';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { AgVirtualSrollComponent } from 'ag-virtual-scroll';

@Component({
  selector: 'app-brew-choose-graph-reference',
  templateUrl: './brew-choose-graph-reference.component.html',
  styleUrls: ['./brew-choose-graph-reference.component.scss'],
})
export class BrewChooseGraphReferenceComponent implements OnInit {
  public static COMPONENT_ID: string = 'brew-choose-graph-reference';
  public brew_segment: string = 'open';
  public radioSelection: string;
  public openBrewsView: Array<Brew> = [];
  public archiveBrewsView: Array<Brew> = [];

  public openBrewsLength: number = 0;
  public archiveBrewsLength: number = 0;
  public brews: Array<Brew>;

  @ViewChild('openScroll', { read: AgVirtualSrollComponent, static: false })
  public openScroll: AgVirtualSrollComponent;
  @ViewChild('archivedScroll', { read: AgVirtualSrollComponent, static: false })
  public archivedScroll: AgVirtualSrollComponent;

  @ViewChild('brewContent', { read: ElementRef })
  public brewContent: ElementRef;
  constructor(
    private readonly modalController: ModalController,
    private readonly uiBrewStorage: UIBrewStorage
  ) {}

  public ngOnInit() {
    setInterval(() => {
      console.log(this.radioSelection);
    }, 2000);
  }

  public segmentChanged() {
    this.retriggerScroll();
  }

  private retriggerScroll() {
    setTimeout(async () => {
      const el = this.brewContent.nativeElement;
      let scrollComponent: AgVirtualSrollComponent;
      if (this.openScroll !== undefined) {
        scrollComponent = this.openScroll;
      } else {
        scrollComponent = this.archivedScroll;
      }

      scrollComponent.el.style.height =
        el.offsetHeight - scrollComponent.el.offsetTop + 'px';
    }, 150);
  }

  public ionViewDidEnter() {
    this.__initializeBrews();
    this.retriggerScroll();
  }
  private __initializeBrews(): void {
    this.brews = this.uiBrewStorage.getAllEntries();
    this.openBrewsView = [];
    this.archiveBrewsView = [];

    this.__initializeBrewView('open');
    this.__initializeBrewView('archiv');
  }
  private __initializeBrewView(_type: string): void {
    // sort latest to top.
    const brewsCopy: Array<Brew> = [...this.brews];
    let brewsFilters: Array<Brew>;

    const isOpen: boolean = _type === 'open';
    if (isOpen) {
      brewsFilters = brewsCopy.filter(
        (e) =>
          e.getBean().finished === !isOpen &&
          e.getMill().finished === !isOpen &&
          e.getPreparation().finished === !isOpen
      );

      this.openBrewsLength = brewsFilters.length;
      this.archiveBrewsLength = this.brews.length - this.openBrewsLength;
    } else {
      brewsFilters = brewsCopy.filter(
        (e) =>
          e.getBean().finished === !isOpen ||
          e.getMill().finished === !isOpen ||
          e.getPreparation().finished === !isOpen
      );
    }

    const sortedBrews: Array<Brew> = UIBrewHelper.sortBrews(brewsFilters);

    if (_type === 'open') {
      this.openBrewsView = sortedBrews;
    } else {
      this.archiveBrewsView = sortedBrews;
    }
  }
  public chooseGraph(_brew: Brew) {
    this.modalController.dismiss(
      {
        dismissed: true,
        brew: _brew,
      },
      undefined,
      BrewChooseGraphReferenceComponent.COMPONENT_ID
    );
  }
  public choose() {
    const choosenBrew = this.uiBrewStorage.getByUUID(this.radioSelection);
    this.chooseGraph(choosenBrew);
  }
  public dismiss(): void {
    this.modalController.dismiss(
      {
        dismissed: true,
      },
      undefined,
      BrewChooseGraphReferenceComponent.COMPONENT_ID
    );
  }
}
