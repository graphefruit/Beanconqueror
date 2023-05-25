import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Bean } from '../../../classes/bean/bean';
import { IBeanInformation } from '../../../interfaces/bean/iBeanInformation';
import { GreenBean } from '../../../classes/green-bean/green-bean';
import { BEAN_MIX_ENUM } from '../../../enums/beans/mix';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { BeanInformation } from '../../../generated/src/classes/bean/bean';

@Component({
  selector: 'bean-sort-information',
  templateUrl: './bean-sort-information.component.html',
  styleUrls: ['./bean-sort-information.component.scss'],
})
export class BeanSortInformationComponent implements OnInit {
  @Input() public data: Bean | GreenBean;
  @Output() public dataChange = new EventEmitter<Bean | GreenBean>();
  public settings: Settings = undefined;

  public typeaheadSearch = {};

  constructor(
    private readonly uiSettingsStorage: UISettingsStorage,
    public readonly uiBeanHelper: UIBeanHelper,
    private readonly uiBeanStorage: UIBeanStorage
  ) {}

  public ngOnInit() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public addAnotherSort() {
    const beanInformation: IBeanInformation = {} as IBeanInformation;
    this.data.bean_information.push(beanInformation);
  }

  public deleteSortInformation(_index: number) {
    this.data.bean_information.splice(_index, 1);
  }
  public isBlend() {
    if (this.data instanceof Bean) {
      // #193
      return BEAN_MIX_ENUM[this.data.beanMix] === BEAN_MIX_ENUM.BLEND;
    }
    return false;
  }

  public onSearchChange(_type: string, event: any) {
    if (!this.typeaheadSearch[_type + 'Focused']) {
      return;
    }
    let actualSearchValue = event.target.value;
    this.typeaheadSearch[_type + 'ResultsAvailable'] = false;
    this.typeaheadSearch[_type + 'Results'] = [];
    if (actualSearchValue === undefined || actualSearchValue === '') {
      return;
    }

    actualSearchValue = actualSearchValue.toLowerCase();
    const filteredEntries: Array<Bean> = this.uiBeanStorage
      .getAllEntries()
      .filter((e) =>
        e.bean_information.find((be) => {
          if (be && be.hasOwnProperty(_type)) {
            return be[_type].toLowerCase().includes(actualSearchValue);
          }
        })
      );

    for (const entry of filteredEntries) {
      const beanInfoList = entry.bean_information.filter((be) => {
        if (be && be.hasOwnProperty(_type)) {
          return be[_type].toLowerCase().includes(actualSearchValue);
        }
      });

      for (const beanInfoEntry of beanInfoList) {
        if (beanInfoEntry && beanInfoEntry.hasOwnProperty(_type)) {
          const splittedInfos = beanInfoEntry[_type].split(/(?:,|; )+/);
          this.typeaheadSearch[_type + 'Results'].push(...splittedInfos);
        }
      }
    }
    // Distinct values
    this.typeaheadSearch[_type + 'Results'] = Array.from(
      new Set(this.typeaheadSearch[_type + 'Results'].map((e) => e))
    );

    if (this.typeaheadSearch[_type + 'Results'].length > 0) {
      this.typeaheadSearch[_type + 'ResultsAvailable'] = true;
    } else {
      this.typeaheadSearch[_type + 'ResultsAvailable'] = false;
    }
  }

  public searchResultsAvailable(_type): boolean {
    if (this.typeaheadSearch[_type + 'Results']) {
      return this.typeaheadSearch[_type + 'Results'].length > 0;
    }
    return false;
  }

  public getResults(_type: string) {
    if (this.typeaheadSearch[_type + 'Results']) {
      return this.typeaheadSearch[_type + 'Results'];
    }
    return [];
  }
  public onSearchLeave(_type: string) {
    setTimeout(() => {
      this.typeaheadSearch[_type + 'ResultsAvailable'] = false;
      this.typeaheadSearch[_type + 'Results'] = [];
      this.typeaheadSearch[_type + 'Focused'] = false;
    }, 150);
  }
  public onSearchFocus(_type: string) {
    this.typeaheadSearch[_type + 'Focused'] = true;
  }

  public searchResultSelected(
    _index: number,
    _type: string,
    selected: string
  ): void {
    this.data.bean_information[_index][_type] = selected;
    this.onSearchLeave(_type);
  }
}
