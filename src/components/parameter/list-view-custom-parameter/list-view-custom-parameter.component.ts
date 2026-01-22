import {
  ChangeDetectorRef,
  Component,
  inject,
  Input,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonCard,
  IonCheckbox,
  IonItem,
  IonTitle,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { Preparation } from '../../../classes/preparation/preparation';
import { Settings } from '../../../classes/settings/settings';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'list-view-custom-parameter',
  templateUrl: './list-view-custom-parameter.component.html',
  styleUrls: ['./list-view-custom-parameter.component.scss'],
  imports: [
    FormsModule,
    TranslatePipe,
    IonCard,
    IonTitle,
    IonItem,
    IonCheckbox,
  ],
})
export class ListViewCustomParameterComponent implements OnInit {
  uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  @Input() public data: Settings | Preparation;

  public ngOnInit() {}

  public isPreparation() {
    return this.data instanceof Preparation;
  }

  public firstDripDisabled(): boolean {
    //#598
    return false;
    if (this.isPreparation()) {
      const prep: Preparation = this.data as Preparation;
      return prep.style_type !== PREPARATION_STYLE_TYPE.ESPRESSO;
    }
    return false;
  }

  public brewQuantityDisabled(): boolean {
    if (this.isPreparation()) {
      const prep: Preparation = this.data as Preparation;
      return prep.style_type === PREPARATION_STYLE_TYPE.ESPRESSO;
    }
    return false;
  }
  public async save() {
    this.changeDetectorRef.detectChanges();
    if (this.data instanceof Settings) {
      await this.uiSettingsStorage.saveSettings(this.data as Settings);
    } else {
      await this.uiPreparationStorage.update(this.data as Preparation);
    }
  }
}
