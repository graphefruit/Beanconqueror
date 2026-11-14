import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calculatorOutline,
  codeSlashOutline,
  informationCircleOutline,
  logoDiscord,
  logoFacebook,
  logoInstagram,
  settingsOutline,
  statsChartOutline,
  waterOutline,
} from 'ionicons/icons';

import { TranslatePipe } from '@ngx-translate/core';

import { HeaderComponent } from '../../components/header/header.component';
import LINK_TRACKING from '../../data/tracking/linkTracking';
import { PREPARATION_TYPES } from '../../enums/preparations/preparationTypes';
import { UIAnalytics } from '../../services/uiAnalytics';
import { UIHelper } from '../../services/uiHelper';
import { UIMillStorage } from '../../services/uiMillStorage';
import { UIPreparationStorage } from '../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../services/uiSettingsStorage';
import { UIWaterStorage } from '../../services/uiWaterStorage';

/** Translation key and parameters of an entry's count line. */
interface CountLine {
  key: string;
  params: { count: number };
}

/** An entry that opens a page; title and description are translation keys. */
interface HubEntry {
  link: string;
  icon: string;
  title: string;
  description: string;
}

interface SocialLink {
  name: string;
  icon: string;
  url: string;
  trackingAction: string;
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

const BARISTA_MODE: HubEntry = {
  link: '/baristamode',
  icon: 'beanconqueror-preparation-sanremo-you',
  title: 'NAV_BARISTAMODE_SECTION',
  description: 'PROFILE_BARISTA_MODE_DESCRIPTION',
};

const GRAPHS: HubEntry = {
  link: '/graph-section',
  icon: 'beanconqueror-graph',
  title: 'NAV_GRAPH_SECTION',
  description: 'PROFILE_GRAPHS_DESCRIPTION',
};

const ROASTING: HubEntry = {
  link: '/roasting-section',
  icon: 'beanconqueror-coffee-roaster',
  title: 'NAV_ROASTING_SECTION',
  description: 'PROFILE_ROASTING_DESCRIPTION',
};

const ALWAYS_SHOWN_SECTIONS: HubEntry[] = [
  {
    link: '/statistic',
    icon: 'stats-chart-outline',
    title: 'NAV_STATISTICS',
    description: 'PROFILE_STATISTICS_DESCRIPTION',
  },
  {
    link: '/brew-parameter',
    icon: 'beanconqueror-brew',
    title: 'NAV_BREW_PARAMS',
    description: 'PROFILE_BREW_PARAMETERS_DESCRIPTION',
  },
  {
    link: '/bean-parameter',
    icon: 'beanconqueror-bean',
    title: 'NAV_BEAN_PARAMS',
    description: 'PROFILE_BEAN_PARAMETERS_DESCRIPTION',
  },
  {
    link: '/helper',
    icon: 'calculator-outline',
    title: 'NAV_HELPER',
    description: 'PROFILE_CALCULATIONS_DESCRIPTION',
  },
];

const APP_ENTRIES: HubEntry[] = [
  {
    link: '/settings',
    icon: 'settings-outline',
    title: 'NAV_SETTINGS',
    description: 'PROFILE_SETTINGS_DESCRIPTION',
  },
  {
    link: '/info',
    icon: 'information-circle-outline',
    title: 'PROFILE_INFO_SUPPORT',
    description: 'PROFILE_INFO_SUPPORT_DESCRIPTION',
  },
];

const SOCIAL_LINKS: SocialLink[] = [
  {
    name: 'Instagram',
    icon: 'logo-instagram',
    url: 'https://www.instagram.com/beanconqueror/',
    trackingAction: LINK_TRACKING.ACTIONS.INSTAGRAM,
  },
  {
    name: 'Facebook',
    icon: 'logo-facebook',
    url: 'https://www.facebook.com/Beanconqueror/',
    trackingAction: LINK_TRACKING.ACTIONS.FACEBOOK,
  },
  {
    name: 'GitHub',
    icon: 'code-slash-outline',
    url: 'https://github.com/graphefruit/Beanconqueror',
    trackingAction: LINK_TRACKING.ACTIONS.GITHUB,
  },
  {
    name: 'Discord',
    icon: 'logo-discord',
    url: 'https://discord.gg/vDzA5dZjG8',
    trackingAction: LINK_TRACKING.ACTIONS.DISCORD,
  },
];

/**
 * Profile tab: the hub for everything that is not a tab of its own. Equipment
 * (preparation methods, grinders, water, barista mode), the app's sections,
 * settings and info, and at the bottom the community links and the legal
 * pages. Optional sections are listed only while they are switched on.
 */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    NgTemplateOutlet,
    RouterLink,
    TranslatePipe,
    IonHeader,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    IonButton,
    HeaderComponent,
  ],
})
export class ProfilePage implements OnInit {
  private readonly uiSettingsStorage = inject(UISettingsStorage);
  private readonly uiPreparationStorage = inject(UIPreparationStorage);
  private readonly uiMillStorage = inject(UIMillStorage);
  private readonly uiWaterStorage = inject(UIWaterStorage);
  private readonly uiAnalytics = inject(UIAnalytics);
  private readonly uiHelper = inject(UIHelper);
  private readonly destroyRef = inject(DestroyRef);

  /** Water is an opt-in section; it is listed only once it is switched on in the settings. */
  public waterSectionVisible = false;

  /** Listed while an active Sanremo YOU preparation method exists. */
  public baristaMode?: HubEntry;

  /** Statistics, parameters and calculations, then the optional sections that are switched on. */
  public sections: HubEntry[] = [];
  public readonly appEntries = APP_ENTRIES;
  public readonly socialLinks = SOCIAL_LINKS;

  /**
   * Active (not archived) entries per section, as shown in the entry. Without
   * an active preparation method or grinder the profile tab shows a dot; the
   * entry concerned says why.
   */
  public preparations?: CountLine;
  public mills?: CountLine;
  public waters?: CountLine;

  constructor() {
    addIcons({
      calculatorOutline,
      waterOutline,
      statsChartOutline,
      settingsOutline,
      informationCircleOutline,
      logoInstagram,
      logoFacebook,
      codeSlashOutline,
      logoDiscord,
    });
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

  public openSocialLink(link: SocialLink) {
    this.uiAnalytics.trackEvent(LINK_TRACKING.TITLE, link.trackingAction);
    this.uiHelper.openExternalWebpage(link.url);
  }

  private update() {
    const settings = this.uiSettingsStorage.getSettings();
    const active = <T extends { finished: boolean }>(entries: T[]) =>
      entries.filter((entry) => entry.finished === false);
    const preparations = active(this.uiPreparationStorage.getAllEntries());

    this.waterSectionVisible = settings.show_water_section;
    this.baristaMode = preparations.some(
      (preparation) => preparation.type === PREPARATION_TYPES.SANREMO_YOU,
    )
      ? BARISTA_MODE
      : undefined;
    this.sections = [
      ...ALWAYS_SHOWN_SECTIONS,
      ...(settings.show_graph_section ? [GRAPHS] : []),
      ...(settings.show_roasting_section ? [ROASTING] : []),
    ];
    this.preparations = countLine('PROFILE_PREPARATIONS', preparations.length);
    this.mills = countLine(
      'PROFILE_MILLS',
      active(this.uiMillStorage.getAllEntries()).length,
    );
    this.waters = countLine(
      'PROFILE_WATERS',
      active(this.uiWaterStorage.getAllEntries()).length,
    );
  }
}

export default ProfilePage;
