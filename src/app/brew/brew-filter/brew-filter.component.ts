import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { IBrewPageFilter } from '../../../interfaces/brew/iBrewPageFilter';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { Bean } from '../../../classes/bean/bean';
import { Mill } from '../../../classes/mill/mill';
import { Preparation } from '../../../classes/preparation/preparation';
import { Settings } from '../../../classes/settings/settings';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { Brew } from '../../../classes/brew/brew';
import { AppEventType } from '../../../enums/appEvent/appEvent';
import { Subscription } from 'rxjs';
import { EventQueueService } from '../../../services/queueService/queue-service.service';

@Component({
  selector: 'brew-filter',
  templateUrl: './brew-filter.component.html',
  styleUrls: ['./brew-filter.component.scss'],
})
export class BrewFilterComponent implements OnInit {
  public static COMPONENT_ID = 'brew-filter';
  public settings: Settings;

  private preparationMethodFocusedSubscription: Subscription = undefined;

  public brews: Array<Brew> = [];
  public filter: IBrewPageFilter;
  public method_of_preparations: Array<Preparation> = [];
  public beans: Array<Bean> = [];
  public mills: Array<Mill> = [];
  @Input('segment') public segment: string = 'open';
  @Input('brew_filter') public brew_filter: any;
  @Input('hide_options') public hide_options: any;

  public profiles: Array<string> = [];
  public selectOptions = {
    cssClass: 'select-max-width',
  };

  public preparationToolsExist: boolean;
  public maxBrewRating: number;
  public filterParameterActive: boolean = false;
  constructor(
    private readonly modalController: ModalController,
    public readonly uiHelper: UIHelper,
    private readonly uiSettingsStorage: UISettingsStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiBeanStorage: UIBeanStorage,
    private readonly uiMillStorage: UIMillStorage,
    private readonly uiBrewStorage: UIBrewStorage,
    private readonly eventQueue: EventQueueService,
  ) {
    this.settings = this.uiSettingsStorage.getSettings();
    this.filter = this.settings.GET_BREW_FILTER();
    this.brews = this.uiBrewStorage.getAllEntries();
    this.filterParameterActive = this.settings.show_water_section;
  }

  public ngOnInit() {
    this.filter = this.uiHelper.copyData(this.brew_filter);

    this.__reloadFilterSettings();
    this.profiles = this.getProfiles();
    this.preparationToolsExist = this.hasPreparationTools();
    this.maxBrewRating = this.getMaxBrewRating();
  }
  public showOption(_option: string) {
    if (_option === 'chart_data') {
      if (this.hide_options && this.hide_options?.chart_data === true) {
        return false;
      }
    }
    return true;
  }
  public pinFormatter(value: any) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return `${0}`;
    }
    const newValue = +parsedFloat.toFixed(2);
    return `${newValue}`;
  }
  public getMaxBrewRating() {
    const maxSettingsRating = this.settings.brew_rating;
    const isOpen = this.segment === 'open';
    let brewsFiltered: Array<Brew> = [];
    if (isOpen) {
      brewsFiltered = this.brews.filter(
        (e) =>
          e.getBean().finished === !isOpen &&
          e.getMill().finished === !isOpen &&
          e.getPreparation().finished === !isOpen,
      );
    } else {
      brewsFiltered = this.brews.filter(
        (e) =>
          e.getBean().finished === !isOpen ||
          e.getMill().finished === !isOpen ||
          e.getPreparation().finished === !isOpen,
      );
    }
    let maxBrewRating = maxSettingsRating;
    if (brewsFiltered.length > 0) {
      const maxRating = brewsFiltered.reduce((p, c) =>
        p.rating > c.rating ? p : c,
      );
      maxBrewRating = maxRating.rating;
    }

    if (maxBrewRating > maxSettingsRating) {
      return maxBrewRating;
    }
    return maxSettingsRating;
  }

  public hasPreparationTools() {
    for (const uuid of this.filter.method_of_preparation) {
      const preparation = this.uiPreparationStorage.getByUUID(uuid);
      if (preparation.tools.length > 0) {
        return true;
      }
    }
    return false;
  }

  public resetPreparationTools() {
    this.filter.method_of_preparation_tools = [];
    this.preparationToolsExist = this.hasPreparationTools();
  }

  public preparationMethodFocused() {
    this.deattachToPreparationMethodFocused();
    const eventSubs = this.eventQueue.on(
      AppEventType.PREPARATION_SELECTION_CHANGED,
    );
    this.preparationMethodFocusedSubscription = eventSubs.subscribe((next) => {
      this.resetPreparationTools();
      this.deattachToPreparationMethodFocused();
    });
  }

  public deattachToPreparationMethodFocused() {
    if (this.preparationMethodFocusedSubscription) {
      this.preparationMethodFocusedSubscription.unsubscribe();
      this.preparationMethodFocusedSubscription = undefined;
    }
  }

  public getProfiles() {
    const brews: Array<Brew> = this.brews.filter(
      (e) => e.pressure_profile !== '',
    );
    const profiles = [];
    for (const brew of brews) {
      if (profiles.indexOf(brew.pressure_profile) <= -1) {
        profiles.push(brew.pressure_profile);
      }
    }
    profiles.sort((a, b) => {
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    });
    return profiles;
  }

  public dismiss(): void {
    this.modalController.dismiss({
      brew_filter: undefined,
    });
  }

  public useFilter() {
    this.modalController.dismiss({
      brew_filter: this.uiHelper.copyData(this.filter),
    });
  }

  public resetFilter() {
    this.filter = this.settings.GET_BREW_FILTER();
    this.modalController.dismiss(
      {
        brew_filter: this.uiHelper.copyData(this.filter),
      },
      undefined,
      BrewFilterComponent.COMPONENT_ID,
    );
  }

  private __reloadFilterSettings() {
    this.method_of_preparations = this.uiPreparationStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
    this.beans = this.uiBeanStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
    this.mills = this.uiMillStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));

    if (this.segment === 'open') {
      this.beans = this.beans.filter((e) => e.finished === false);
      this.mills = this.mills.filter((e) => e.finished === false);
      this.method_of_preparations = this.method_of_preparations.filter(
        (e) => e.finished === false,
      );
    } else {
      this.beans = this.beans.filter((e) => e.finished === true);
    }
  }
}
