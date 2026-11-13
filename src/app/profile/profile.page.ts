import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  settingsOutline,
  statsChartOutline,
  waterOutline,
} from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderComponent } from '../../components/header/header.component';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIWaterStorage } from '../../services/uiWaterStorage';

/** Translation key and parameters of an entry's count line. */
interface CountLine {
  key: string;
  params: { count: number };
}

/**
 * Picks the count line for `count` active entries, or none when there are no
 * entries yet: the entry then says so itself.
 */
function countLine(prefix: string, count: number): CountLine | undefined {
  if (count === 0) {
    return undefined;
  }
  return {
    key: `${prefix}_COUNT_${count === 1 ? 'ONE' : 'OTHER'}`,
    params: { count },
  };
}

/**
 * Profile tab: the hub for the sections that are not tabs of their own
 * (preparation methods, grinders, water, statistics and settings), grouped
 * into equipment and app.
 */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    RouterLink,
    TranslatePipe,
    IonHeader,
    IonMenuButton,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    HeaderComponent,
  ],
})
export class ProfilePage implements OnInit {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiWaterStorage = inject(UIWaterStorage);
  private readonly destroyRef = inject(DestroyRef);

  /** Water is an opt-in section; it is listed only once it is switched on in the settings. */
  public waterSectionVisible = false;

  /**
   * Active (not archived) entries per section, as shown in the entry. Without
   * an active preparation method or grinder the profile tab shows a dot; the
   * entry concerned says why.
   */
  public preparations?: CountLine;
  public mills?: CountLine;
  public waters?: CountLine;

  constructor() {
    addIcons({ waterOutline, statsChartOutline, settingsOutline });
  }

  public ngOnInit() {
    this.update();
    for (const storage of [
      this.uiSettingsStorage,
      this.uiPreparationStorage,
      this.uiMillStorage,
      this.uiWaterStorage,
    ]) {
      storage
        .attachOnEvent()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.update());
    }
  }

  private update() {
    const active = (entries: { finished: boolean }[]) =>
      entries.filter((entry) => entry.finished === false).length;

    this.waterSectionVisible =
      this.uiSettingsStorage.getSettings().show_water_section;
    this.preparations = countLine(
      'PROFILE_PREPARATIONS',
      active(this.uiPreparationStorage.getAllEntries()),
    );
    this.mills = countLine(
      'PROFILE_MILLS',
      active(this.uiMillStorage.getAllEntries()),
    );
    this.waters = countLine(
      'PROFILE_WATERS',
      active(this.uiWaterStorage.getAllEntries()),
    );
  }
}

export default ProfilePage;
