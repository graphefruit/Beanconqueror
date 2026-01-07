import {
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
  inject,
} from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { Subject } from 'rxjs';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Preparation } from '../../../classes/preparation/preparation';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  IonCard,
  IonTitle,
  IonItem,
  IonCheckbox,
} from '@ionic/angular/standalone';

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
