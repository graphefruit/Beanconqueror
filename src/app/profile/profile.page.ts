import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
} from '@ionic/angular/standalone';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderComponent } from '../../components/header/header.component';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';

/**
 * Profile tab: the home of the sections that are not tabs of their own
 * (preparation methods, grinders, water, statistics and settings).
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
    IonLabel,
    HeaderComponent,
  ],
})
export class ProfilePage implements OnInit {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly destroyRef = inject(DestroyRef);

  /** Water is an opt-in section; it is listed only once it is switched on in the settings. */
  public waterSectionVisible = false;

  /**
   * Without an active preparation method or grinder the profile tab shows a dot;
   * the entry concerned says why.
   */
  public preparationsExist = true;
  public millsExist = true;

  public ngOnInit() {
    this.update();
    for (const storage of [
      this.uiSettingsStorage,
      this.uiPreparationStorage,
      this.uiMillStorage,
    ]) {
      storage
        .attachOnEvent()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.update());
    }
  }

  private update() {
    this.waterSectionVisible =
      this.uiSettingsStorage.getSettings().show_water_section;
    this.preparationsExist = this.uiPreparationStorage
      .getAllEntries()
      .some((preparation) => preparation.finished === false);
    this.millsExist = this.uiMillStorage
      .getAllEntries()
      .some((mill) => mill.finished === false);
  }
}

export default ProfilePage;
