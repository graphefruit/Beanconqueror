import { Component, Input, OnInit, inject } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { Preparation } from '../../../classes/preparation/preparation';
import { Bean } from '../../../classes/bean/bean';
import { Mill } from '../../../classes/mill/mill';
import { ModalController } from '@ionic/angular/standalone';
import { UIHelper } from '../../../services/uiHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { IBeanPageFilter } from '../../../interfaces/bean/iBeanPageFilter';
import { BEAN_ROASTING_TYPE_ENUM } from '../../../enums/beans/beanRoastingType';
import { FormsModule } from '@angular/forms';
import { ChooseDateOverlayDirective } from '../../../directive/choose-date.directive';
import { TransformDateDirective } from '../../../directive/transform-date';
import { TranslatePipe } from '@ngx-translate/core';
import { KeysPipe } from '../../../pipes/keys';
import { ToFixedPipe } from '../../../pipes/toFixed';
import {
  IonHeader,
  IonContent,
  IonItem,
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonGrid,
  IonRow,
  IonCol,
  IonInput,
  IonLabel,
  IonRange,
  IonIcon,
  IonBadge,
  IonList,
  IonButton,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-bean-filter',
  templateUrl: './bean-filter.component.html',
  styleUrls: ['./bean-filter.component.scss'],
  imports: [
    FormsModule,
    ChooseDateOverlayDirective,
    TransformDateDirective,
    TranslatePipe,
    KeysPipe,
    ToFixedPipe,
    IonHeader,
    IonContent,
    IonItem,
    IonToggle,
    IonSelect,
    IonSelectOption,
    IonGrid,
    IonRow,
    IonCol,
    IonInput,
    IonLabel,
    IonRange,
    IonIcon,
    IonBadge,
    IonList,
    IonButton,
  ],
})
export class BeanFilterComponent implements OnInit {
  private readonly modalController = inject(ModalController);
  readonly uiHelper = inject(UIHelper);
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiBeanStorage = inject(UIBeanStorage);
  private readonly uiMillStorage = inject(UIMillStorage);

  public static readonly COMPONENT_ID = 'bean-filter';
  public settings: Settings;

  public filter: IBeanPageFilter;
  public method_of_preparations: Array<Preparation> = [];
  public beans: Array<Bean> = [];
  public listBeans: Array<Bean> = [];
  public mills: Array<Mill> = [];
  @Input('segment') public segment: string = 'open';

  @Input('bean_filter') public bean_filter: any;

  public beanRoastingTypeEnum = BEAN_ROASTING_TYPE_ENUM;

  public roasteries: Array<string> = undefined;

  public maxBeanRating: number = undefined;

  constructor() {
    this.settings = this.uiSettingsStorage.getSettings();
  }

  public ngOnInit() {
    this.filter = this.uiHelper.copyData(this.bean_filter);
    this.__reloadFilterSettings();
    this.maxBeanRating = this.getMaxBeanRating();
    this.roasteries = [...new Set(this.listBeans.map((e: Bean) => e.roaster))];
    this.roasteries = this.roasteries
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

  public pinFormatter(value: any) {
    const parsedFloat = parseFloat(value);
    if (isNaN(parsedFloat)) {
      return `${0}`;
    }
    const newValue = +parsedFloat.toFixed(2);
    return `${newValue}`;
  }
  public getMaxBeanRating() {
    const maxSettingsRating = this.settings.bean_rating;
    const isOpen = this.segment === 'open';
    let beansFiltered: Array<Bean>;

    beansFiltered = this.listBeans.filter((e) => e.finished === !isOpen);

    let maxBeanRating = maxSettingsRating;
    if (beansFiltered.length > 0) {
      const maxRating = beansFiltered.reduce((p, c) =>
        p.rating > c.rating ? p : c,
      );
      maxBeanRating = maxRating.rating;
    }

    if (maxBeanRating > maxSettingsRating) {
      return maxBeanRating;
    }
    return maxSettingsRating;
  }

  public dismiss(): void {
    this.modalController.dismiss({
      bean_filter: undefined,
    });
  }

  public useFilter() {
    this.modalController.dismiss({
      bean_filter: this.uiHelper.copyData(this.filter),
    });
  }

  public resetFilter() {
    this.filter = this.settings.GET_BEAN_FILTER();
    this.modalController.dismiss(
      {
        bean_filter: this.uiHelper.copyData(this.filter),
      },
      undefined,
      BeanFilterComponent.COMPONENT_ID,
    );
  }

  private __reloadFilterSettings() {
    this.method_of_preparations = this.uiPreparationStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
    this.mills = this.uiMillStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));
    this.listBeans = this.uiBeanStorage
      .getAllEntries()
      .sort((a, b) => a.name.localeCompare(b.name));

    /** we accept open and frozen **/
    if (this.segment !== 'archive') {
      this.beans = this.listBeans.filter((e) => e.finished === false);
      this.mills = this.mills.filter((e) => e.finished === false);
      this.method_of_preparations = this.method_of_preparations.filter(
        (e) => e.finished === false,
      );
    } else {
      this.beans = this.listBeans.filter((e) => e.finished === true);
    }
  }
}
