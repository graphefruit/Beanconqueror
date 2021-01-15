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
  selector: 'reporting-parameter',
  templateUrl: './reporting-parameter.component.html',
  styleUrls: ['./reporting-parameter.component.scss'],
})
export class ReportingParameterComponent implements OnInit {



  public debounceChanges: Subject<string> = new Subject<string>();

  @Input() public data: Settings | Preparation;
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

  public save(): void {
    this.changeDetectorRef.detectChanges();
    if (this.data instanceof Settings) {
      this.uiSettingsStorage.saveSettings(this.data as Settings);
    } else {
      this.uiPreparationStorage.update(this.data as Preparation);
    }


  }


}
