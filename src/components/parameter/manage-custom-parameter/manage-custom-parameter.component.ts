import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {Settings} from '../../../classes/settings/settings';
import {Subject} from 'rxjs';
import {UISettingsStorage} from '../../../services/uiSettingsStorage';
import {UIAnalytics} from '../../../services/uiAnalytics';
import {debounceTime, distinctUntilChanged} from 'rxjs/operators';
import {Preparation} from '../../../classes/preparation/preparation';
import {UIPreparationStorage} from '../../../services/uiPreparationStorage';
import {PREPARATION_STYLE_TYPE} from '../../../enums/preparations/preparationStyleTypes';

@Component({
  selector: 'manage-custom-parameter',
  templateUrl: './manage-custom-parameter.component.html',
  styleUrls: ['./manage-custom-parameter.component.scss'],
})
export class ManageCustomParameterComponent implements OnInit {



  public debounceChanges: Subject<string> = new Subject<string>();

  @Input() private data: Settings | Preparation;
  constructor(public uiSettingsStorage: UISettingsStorage,
              private readonly uiPreparationStorage: UIPreparationStorage,
              private readonly uiAnalytics: UIAnalytics,
              private readonly changeDetectorRef: ChangeDetectorRef) {
    this.debounceChanges
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(() => {
        this.save();
      });

  }

  public ngOnInit() {
  }

  public triggerChanges(_query): void {
    this.debounceChanges.next(_query);
  }
  public isPreparation(): boolean {
    return this.data instanceof Preparation;
  }

  public firstDripDisabled(): boolean {
    if (this.isPreparation()) {
      const prep: Preparation = this.data as Preparation;
      return (prep.style_type !== PREPARATION_STYLE_TYPE.ESPRESSO);
    }
    return false;
  }
  public brewQuantityDisabled(): boolean {
   if (this.isPreparation()) {
     const prep: Preparation = this.data as Preparation;
     return (prep.style_type === PREPARATION_STYLE_TYPE.ESPRESSO);
   }
   return false;
  }

  public save(): void {
    this.changeDetectorRef.detectChanges();
    if (this.data instanceof Settings) {
      this.uiSettingsStorage.saveSettings(this.data as Settings);
    } else {
      this.uiPreparationStorage.update(this.data as Preparation);
    }

  }


}
