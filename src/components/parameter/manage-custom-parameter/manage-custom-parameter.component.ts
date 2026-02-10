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
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { Preparation } from '../../../classes/preparation/preparation';
import { Settings } from '../../../classes/settings/settings';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

@Component({
  selector: 'manage-custom-parameter',
  templateUrl: './manage-custom-parameter.component.html',
  styleUrls: ['./manage-custom-parameter.component.scss'],
  imports: [
    FormsModule,
    TranslatePipe,
    IonCard,
    IonTitle,
    IonItem,
    IonCheckbox,
  ],
})
export class ManageCustomParameterComponent implements OnInit {
  uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  public debounceChanges: Subject<string> = new Subject<string>();

  private numerator: number = 0;
  @Input() public data: Settings | Preparation;
  constructor() {
    this.debounceChanges
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(() => {
        this.save();
      });
  }

  public ngOnInit() {}

  public triggerChanges(_query): void {
    this.debounceChanges.next(this.numerator.toString());
    this.numerator = this.numerator + 1;
  }
  public isPreparation(): boolean {
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
