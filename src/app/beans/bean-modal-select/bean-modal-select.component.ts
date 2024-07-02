import {
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { BEAN_ROASTING_TYPE_ENUM } from '../../../enums/beans/beanRoastingType';
import { IBeanPageFilter } from '../../../interfaces/bean/iBeanPageFilter';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { Settings } from '../../../classes/settings/settings';
import { AgVirtualSrollComponent } from 'ag-virtual-scroll';

@Component({
  selector: 'bean-modal-select',
  templateUrl: './bean-modal-select.component.html',
  styleUrls: ['./bean-modal-select.component.scss'],
})
export class BeanModalSelectComponent implements OnInit {
  public static COMPONENT_ID = 'bean-modal-select';
  public bean_segment: string = 'open';
  public objs: Array<Bean> = [];
  public multipleSelection = {};
  public radioSelection: string;
  @Input() public multiple: boolean;
  @Input() public showFinished: boolean;
  @Input() private selectedValues: Array<string>;
  public beanRoastingTypeEnum = BEAN_ROASTING_TYPE_ENUM;
  public openBeansFilterText: string = '';
  public openBeans: Array<Bean> = [];
  public finishedBeansFilterText: string = '';
  public finishedBeans: Array<Bean> = [];

  public filter_open: IBeanPageFilter;
  public filter_finished: IBeanPageFilter;
  public open_roasteries: Array<string> = undefined;

  public finished_roasteries: Array<string> = undefined;
  public settings: Settings;

  public filterVisible: any = {
    open: false,
    archived: false,
  };

  @ViewChild('openScroll', { read: AgVirtualSrollComponent, static: false })
  public openScroll: AgVirtualSrollComponent;
  @ViewChild('archivedScroll', {
    read: AgVirtualSrollComponent,
    static: false,
  })
  public archivedScroll: AgVirtualSrollComponent;
  @ViewChild('beanContent', { read: ElementRef })
  public beanContent: ElementRef;

  @ViewChild('footerContent', { read: ElementRef })
  public footerContent: ElementRef;

  constructor(
    private readonly modalController: ModalController,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiBeanHelper: UIBeanHelper,
    private readonly uiSettingsStorage: UISettingsStorage
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
    this.loadBeans();
  }

  public loadBeans() {
    this.objs = this.uiBeanStorage.getAllEntries();
    this.filter_open = this.settings.GET_BEAN_FILTER();
    this.filter_finished = this.settings.GET_BEAN_FILTER();
    const beans: Array<Bean> = this.uiBeanStorage.getAllEntries();
    this.open_roasteries = [
      ...new Set(
        beans.filter((e) => e.finished === false).map((e: Bean) => e.roaster)
      ),
    ];
    this.open_roasteries = this.open_roasteries
      .filter((name: string) => name !== '')
      .sort((a, b) => {
        const nameA = a.toUpperCase();
        const nameB = b.toUpperCase();

        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        return 0;
      });
    this.finished_roasteries = [
      ...new Set(
        beans.filter((e) => e.finished === true).map((e: Bean) => e.roaster)
      ),
    ];
    this.finished_roasteries = this.finished_roasteries
      .filter((name: string) => name !== '')
      .sort((a, b) => {
        const nameA = a.toUpperCase();
        const nameB = b.toUpperCase();

        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        return 0;
      });
  }

  public async add() {
    await this.uiBeanHelper.addBean();
    this.loadBeans();
    this.research();
  }

  @HostListener('window:resize')
  @HostListener('window:orientationchange', ['$event'])
  public onOrientationChange(event) {
    this.retriggerScroll();
  }
  public segmentChanged() {
    this.retriggerScroll();
  }
  private retriggerScroll() {
    setTimeout(async () => {
      const el = this.beanContent.nativeElement;
      let scrollComponent: AgVirtualSrollComponent;
      if (this.openScroll !== undefined) {
        scrollComponent = this.openScroll;
      } else {
        scrollComponent = this.archivedScroll;
      }
      const footerEl = this.footerContent.nativeElement;
      // right bracing
      scrollComponent.el.style.height =
        el.offsetHeight -
        footerEl.offsetHeight -
        10 -
        scrollComponent.el.offsetTop +
        'px';
    }, 250);
  }

  public ionViewDidEnter(): void {
    if (this.multiple) {
      for (const obj of this.objs) {
        this.multipleSelection[obj.config.uuid] =
          this.selectedValues.filter((e) => e === obj.config.uuid).length > 0;
      }
    } else {
      if (this.selectedValues.length > 0) {
        this.radioSelection = this.selectedValues[0];
      }
    }
    this.research();
  }

  public getUsedWeightCount(_bean: Bean): number {
    let usedWeightCount: number = 0;
    const relatedBrews: Array<Brew> = this.uiBeanHelper.getAllBrewsForThisBean(
      _bean.config.uuid
    );
    for (const brew of relatedBrews) {
      if (brew.bean_weight_in > 0) {
        usedWeightCount += brew.bean_weight_in;
      } else {
        usedWeightCount += brew.grind_weight;
      }
    }
    return usedWeightCount;
  }

  public ngOnInit() {}

  public getOpenBeans(): Array<Bean> {
    return this.objs
      .filter((e) => !e.finished)
      .sort((a, b) => {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();

        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        return 0;
      });
  }

  public getFinishedBeans(): Array<Bean> {
    return this.objs
      .filter((e) => e.finished)
      .sort((a, b) => {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();

        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        return 0;
      });
  }

  public async choose(): Promise<void> {
    const chosenKeys: Array<string> = [];
    if (this.multiple) {
      for (const key in this.multipleSelection) {
        if (this.multipleSelection[key] === true) {
          chosenKeys.push(key);
        }
      }
    } else {
      chosenKeys.push(this.radioSelection);
    }
    let selected_text: string = '';

    for (const val of chosenKeys) {
      const bean = this.uiBeanStorage.getByUUID(val);
      selected_text += bean.name + ', ';
    }

    selected_text = selected_text.substr(0, selected_text.lastIndexOf(', '));
    this.modalController.dismiss(
      {
        selected_values: chosenKeys,
        selected_text: selected_text,
      },
      undefined,
      BeanModalSelectComponent.COMPONENT_ID
    );
  }

  public async dismiss(): Promise<void> {
    this.modalController.dismiss(
      undefined,
      undefined,
      BeanModalSelectComponent.COMPONENT_ID
    );
  }
  public isBeanRoastUnknown(_bean: Bean) {
    if (_bean) {
      return (
        _bean.bean_roasting_type === ('UNKNOWN' as BEAN_ROASTING_TYPE_ENUM)
      );
    }
    return true;
  }

  public async showFilter(_type: string) {
    if (_type === 'open') {
      this.filterVisible.open = !this.filterVisible.open;
    } else {
      this.filterVisible.archived = !this.filterVisible.archived;
    }
    this.retriggerScroll();
  }
  public isFilterActive(_type: string) {
    if (_type === 'open') {
      return this.filterVisible.open;
    }
    return this.filterVisible.archived;
  }

  public research() {
    this.__initializeBeansView('open');
    this.__initializeBeansView('archiv');
    this.retriggerScroll();
  }
  private __initializeBeansView(_type: string) {
    const beansCopy: Array<Bean> = [...this.objs];
    const isOpen: boolean = _type === 'open';

    let filterBeans: Array<Bean>;
    if (isOpen) {
      filterBeans = beansCopy.filter((bean) => !bean.finished);

      if (this.filter_open.bean_roaster?.length > 0) {
        filterBeans = filterBeans.filter(
          (e: Bean) =>
            this.filter_open.bean_roaster.includes(e.roaster) === true
        );
      }
      if (this.filter_open.bean_roasting_type?.length > 0) {
        filterBeans = filterBeans.filter(
          (e: Bean) =>
            this.filter_open.bean_roasting_type.includes(
              e.bean_roasting_type
            ) === true
        );
      }
    } else {
      filterBeans = beansCopy.filter((bean) => bean.finished);
      if (this.filter_finished.bean_roaster?.length > 0) {
        filterBeans = filterBeans.filter(
          (e: Bean) =>
            this.filter_finished.bean_roaster.includes(e.roaster) === true
        );
      }
      if (this.filter_finished.bean_roasting_type?.length > 0) {
        filterBeans = filterBeans.filter(
          (e: Bean) =>
            this.filter_finished.bean_roasting_type.includes(
              e.bean_roasting_type
            ) === true
        );
      }
    }

    let searchText: string = '';
    if (isOpen) {
      searchText = this.openBeansFilterText.toLowerCase();
    } else {
      searchText = this.finishedBeansFilterText.toLowerCase();
    }

    if (searchText) {
      filterBeans = filterBeans.filter(
        (e) =>
          e.note?.toLowerCase().includes(searchText) ||
          e.name?.toLowerCase().includes(searchText) ||
          e.roaster?.toLowerCase().includes(searchText) ||
          e.aromatics?.toLowerCase().includes(searchText)
      );
    }
    if (isOpen) {
      this.openBeans = filterBeans;
    } else {
      this.finishedBeans = filterBeans;
    }
  }
}
