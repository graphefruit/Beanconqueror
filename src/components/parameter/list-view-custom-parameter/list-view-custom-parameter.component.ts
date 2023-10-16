import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { Settings } from '../../../classes/settings/settings';
import { Preparation } from '../../../classes/preparation/preparation';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { PREPARATION_STYLE_TYPE } from '../../../enums/preparations/preparationStyleTypes';

@Component({
  selector: 'list-view-custom-parameter',
  templateUrl: './list-view-custom-parameter.component.html',
  styleUrls: ['./list-view-custom-parameter.component.scss'],
})
export class ListViewCustomParameterComponent implements OnInit {
  @Input() public data: Settings | Preparation;
  constructor(
    public uiSettingsStorage: UISettingsStorage,
    private readonly uiPreparationStorage: UIPreparationStorage,
    private readonly uiAnalytics: UIAnalytics,
    private readonly changeDetectorRef: ChangeDetectorRef
  ) {}

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
