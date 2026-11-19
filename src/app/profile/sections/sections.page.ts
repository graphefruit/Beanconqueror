import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import {
  IonBackButton,
  IonContent,
  IonHeader,
  IonItem,
  IonList,
  IonToggle,
} from '@ionic/angular';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderComponent } from '../../../components/header/header.component';
import { UIAlert } from '../../../services/uiAlert';
import { UILog } from '../../../services/uiLog';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';

type SectionField =
  'show_roasting_section' | 'show_water_section' | 'show_graph_section';

/** A section that can be switched on; title and description are translation keys. */
interface Section {
  field: SectionField;
  title: string;
  description: string;
}

const SECTIONS: Section[] = [
  {
    field: 'show_roasting_section',
    title: 'NAV_ROASTING_SECTION',
    description: 'PROFILE_ROASTING_DESCRIPTION',
  },
  {
    field: 'show_water_section',
    title: 'NAV_WATER_SECTION',
    description: 'PROFILE_WATER_DESCRIPTION',
  },
  {
    field: 'show_graph_section',
    title: 'NAV_GRAPH_SECTION',
    description: 'PROFILE_GRAPHS_DESCRIPTION',
  },
];

/**
 * Switches the optional sections of the app on and off. Grinders are always
 * part of the app and have no switch.
 */
@Component({
  selector: 'app-sections',
  templateUrl: './sections.page.html',
  styleUrls: ['./sections.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    HeaderComponent,
    IonHeader,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonToggle,
  ],
})
export class SectionsPage {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiAlert = inject(UIAlert);
  private readonly uiLog = inject(UILog);

  public readonly sections = SECTIONS;
  public readonly settings = this.uiSettingsStorage.getSettings();

  public async toggle(field: SectionField, on: boolean): Promise<void> {
    this.settings[field] = on;
    if (field === 'show_water_section' && on) {
      await this.recordWater();
    }
    await this.uiSettingsStorage.saveSettings(this.settings);
  }

  /**
   * With the water section on, brews record their water: in the general
   * parameters and in those of every preparation method.
   */
  private async recordWater(): Promise<void> {
    await this.uiAlert.showLoadingSpinner();
    try {
      this.settings.manage_parameters.water = true;
      await this.uiSettingsStorage.saveSettings(this.settings);
      for (const preparation of this.uiPreparationStorage.getAllEntries()) {
        preparation.manage_parameters.water = true;
        await this.uiPreparationStorage.update(preparation);
      }
    } catch (error) {
      // The section is switched on all the same; the water field can still be
      // switched on per method.
      this.uiLog.error('Could not record the water for all methods', error);
    }
    await this.uiAlert.hideLoadingSpinner();
  }
}

export default SectionsPage;
