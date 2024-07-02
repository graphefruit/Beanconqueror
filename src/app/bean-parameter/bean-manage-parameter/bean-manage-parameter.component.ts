import { ChangeDetectorRef, Component } from '@angular/core';
import { Subject } from 'rxjs';
import { Settings } from '../../../classes/settings/settings';

import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-bean-manage-parameter',
  templateUrl: './bean-manage-parameter.component.html',
  styleUrls: ['./bean-manage-parameter.component.scss'],
})
export class BeanManageParameterComponent {
  public bean_segment = 'general';
  public debounceChanges: Subject<string> = new Subject<string>();
  public data: Settings;
  private numerator: number = 0;

  constructor(
    public uiSettingsStorage: UISettingsStorage,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {
    this.debounceChanges
      .pipe(debounceTime(500), distinctUntilChanged())
      .subscribe(() => {
        this.save();
      });
    this.data = this.uiSettingsStorage.getSettings();
  }

  public triggerChanges(_query): void {
    this.debounceChanges.next(this.numerator.toString());
    this.numerator = this.numerator + 1;
  }

  public async save() {
    this.changeDetectorRef.detectChanges();
    await this.uiSettingsStorage.saveSettings(this.data);
  }
}
