import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { Settings } from '../../../classes/settings/settings';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-bean-list-view-parameter',
  templateUrl: './bean-list-view-parameter.component.html',
  styleUrls: ['./bean-list-view-parameter.component.scss'],
})
export class BeanListViewParameterComponent implements OnInit {
  public bean_segment = 'general';
  public debounceChanges: Subject<string> = new Subject<string>();
  public data: Settings;
  private numerator: number = 0;

  constructor(
    public uiSettingsStorage: UISettingsStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiAnalytics: UIAnalytics,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {
    this.debounceChanges
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(() => {
        this.save();
      });
    this.data = this.uiSettingsStorage.getSettings();
  }

  public ngOnInit() {}

  public triggerChanges(_query): void {
    this.debounceChanges.next(this.numerator.toString());
    this.numerator = this.numerator + 1;
  }

  public async save() {
    this.changeDetectorRef.detectChanges();
    await this.uiSettingsStorage.saveSettings(this.data);
  }
}
