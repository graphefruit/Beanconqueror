import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionSheetController, ModalController } from '@ionic/angular';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxStarsComponent } from 'ngx-stars';

import en from '../../../assets/i18n/en.json';
import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { BeanListViewParameter } from '../../../classes/parameter/beanListViewParameter';
import { Settings } from '../../../classes/settings/settings';
import BEAN_TRACKING from '../../../data/tracking/beanTracking';
import { BEAN_ACTION } from '../../../enums/beans/beanAction';
import { BeanGroup } from '../../../interfaces/bean/beanGroup';
import { IBean } from '../../../interfaces/bean/iBean';
import { BeanMapper } from '../../../mapper/bean/beanMapper';
import { ServerCommunicationService } from '../../../services/serverCommunication/server-communication.service';
import { ShareService } from '../../../services/shareService/share-service.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UIBrewHelper } from '../../../services/uiBrewHelper';
import { UIBrewStorage } from '../../../services/uiBrewStorage';
import { UIHelper } from '../../../services/uiHelper';
import { UIImage } from '../../../services/uiImage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { UIToast } from '../../../services/uiToast';
import { BeanStore } from '../../../stores/beans/bean.store';
import { FakeStoreSource } from '../../../stores/core/__tests__/fake-store-source';
import { DeleteCommands, Deletion } from '../../../stores/delete-commands';
import { BeanShareComponent } from '../../bean-share/bean-share.component';
import {
  BeanActionEvent,
  BeanInformationComponent,
} from '../bean-information.component';

const NOW = Date.parse('2026-03-01T08:00:00.000Z');
const DAY = 86_400_000;

function storedBean(uuid: string, fields: Partial<IBean> = {}): IBean {
  const bean = new Bean();
  Object.assign(bean, fields);
  bean.config.uuid = uuid;
  return JSON.parse(JSON.stringify(bean)) as IBean;
}

function legacyBean(stored: IBean): Bean {
  const bean = new Bean();
  bean.initializeByObject(JSON.parse(JSON.stringify(stored)) as IBean);
  return bean;
}

function storedBrew(bean: string, grams: number, daysAgo: number): object {
  const brew = new Brew();
  brew.bean = bean;
  brew.grind_weight = grams;
  brew.config.unix_timestamp = Math.floor((NOW - daysAgo * DAY) / 1000);
  return JSON.parse(JSON.stringify(brew)) as object;
}

type BrewPart = 'getBean' | 'getMill' | 'getPreparation';

/**
 * A brew as `getAllBrewsForThisBean` returns it, for the repeat action;
 * `archived` names a part of it that is archived.
 */
function activeBrew(at: number, best = false, archived?: BrewPart): Brew {
  const brew = new Brew();
  brew.config.unix_timestamp = at;
  brew.best_brew = best;
  for (const part of ['getBean', 'getMill', 'getPreparation'] as const) {
    brew[part] = () => ({ finished: part === archived }) as never;
  }
  return brew;
}

/** The bean collection, with the writes the card makes. */
class FakeBeanStorage extends FakeStoreSource {
  public update = jasmine
    .createSpy('update')
    .and.callFake(async (bean: Bean) => {
      this.change(
        this.entries.map((entry) =>
          (entry as IBean).config.uuid === bean.config.uuid
            ? (JSON.parse(JSON.stringify(bean)) as IBean)
            : entry,
        ),
      );
      return true;
    });
}

class FakeBrewStorage extends FakeStoreSource {
  public getAllEntries = jasmine.createSpy('getAllEntries').and.callFake(() =>
    this.entries.map((entry) => {
      const brew = new Brew();
      brew.initializeByObject(entry as never);
      return brew;
    }),
  );
}

/** Spies by name, to be handed in as a service. */
function spies(names: string[]): Record<string, jasmine.Spy> {
  return Object.fromEntries(
    names.map((name) => [name, jasmine.createSpy(name)]),
  );
}

describe('BeanInformationComponent', () => {
  let beans: FakeBeanStorage;
  let beanWrites: jasmine.Spy;
  let brews: FakeBrewStorage;
  let commands: Record<string, jasmine.Spy>;
  let analytics: Record<string, jasmine.Spy>;
  let settingsStorage: jasmine.SpyObj<UISettingsStorage>;
  let settings: Settings;
  let helper: Record<string, jasmine.Spy>;
  let alert: Record<string, jasmine.Spy>;
  let toast: Record<string, jasmine.Spy>;
  let brewHelper: Record<string, jasmine.Spy>;
  let modal: Record<string, jasmine.Spy>;
  let actionSheet: Record<string, jasmine.Spy>;
  let server: Record<string, jasmine.Spy>;
  let share: Record<string, jasmine.Spy>;
  let image: Record<string, jasmine.Spy>;
  let uiHelper: Record<string, jasmine.Spy>;

  const alpha = storedBean('alpha', {
    name: 'Alpha',
    weight: 250,
    cost: 12.5,
    roastingDate: new Date(NOW - 10 * DAY).toISOString(),
    roast_range: 3,
    rating: 4,
    qr_code: 'qr',
    frozenId: 'F1',
    attachments: ['photo.jpg'],
    cupped_flavor: {
      custom_flavors: ['Honey'],
      predefined_flavors: { 1: true },
    },
  });

  beforeEach(async () => {
    // The card counts the age of a bean from now.
    spyOn(Date, 'now').and.returnValue(NOW);

    beans = new FakeBeanStorage();
    beanWrites = spyOn(beans, 'applyChanges').and.callThrough();
    brews = new FakeBrewStorage();
    settings = new Settings();
    for (const key of Object.keys(settings.bean_visible_list_view_parameters)) {
      settings.bean_visible_list_view_parameters[key] = true;
    }
    settings.freeze_coffee_beans = true;
    settings.best_brew = true;
    settingsStorage = jasmine.createSpyObj('UISettingsStorage', [
      'getSettings',
      'saveSettings',
    ]);
    settingsStorage.getSettings.and.returnValue(settings);
    settingsStorage.saveSettings.and.resolveTo(true);
    helper = spies([
      'getAllBrewsForThisBean',
      'detailBean',
      'cupBean',
      'archiveBeanWithRatingQuestion',
      'generateQRCode',
      'freezeBean',
      'unfreezeBean',
      'editBean',
      'repeatBean',
    ]);
    helper.getAllBrewsForThisBean.and.returnValue([]);
    alert = spies([
      'showConfirm',
      'showLoadingSpinner',
      'hideLoadingSpinner',
      'showMessage',
      'withLoadingSpinner',
    ]);
    alert.withLoadingSpinner.and.callFake(
      async <T>(work: () => T | Promise<T>) => work(),
    );
    toast = spies(['showInfoToast']);
    commands = spies(['deleteBean', 'brewCount']);
    commands.deleteBean.and.resolveTo('deleted');
    commands.brewCount.and.returnValue(1);
    analytics = spies(['trackEvent']);
    brewHelper = spies(['showAssociatedBrews', 'repeatBrew']);
    modal = spies(['create']);
    actionSheet = spies(['create']);
    server = spies(['getBeanInformation']);
    share = spies(['shareBean']);
    image = spies(['viewPhotos']);
    uiHelper = spies(['toFixedIfNecessary', 'copyToClipboard']);
    uiHelper.toFixedIfNecessary.and.callFake((value: number, dp: number) =>
      UIHelper.prototype.toFixedIfNecessary(value, dp),
    );

    TestBed.configureTestingModule({
      imports: [BeanInformationComponent, TranslateModule.forRoot()],
      providers: [
        provideZonelessChangeDetection(),
        { provide: UIBeanStorage, useValue: beans },
        { provide: UIBrewStorage, useValue: brews },
        { provide: UISettingsStorage, useValue: settingsStorage },
        { provide: UIBeanHelper, useValue: helper },
        { provide: UIAlert, useValue: alert },
        { provide: UIToast, useValue: toast },
        { provide: UIBrewHelper, useValue: brewHelper },
        { provide: ModalController, useValue: modal },
        { provide: ActionSheetController, useValue: actionSheet },
        { provide: ServerCommunicationService, useValue: server },
        { provide: ShareService, useValue: share },
        { provide: UIImage, useValue: image },
        { provide: UIHelper, useValue: uiHelper },
        { provide: UIAnalytics, useValue: analytics },
        { provide: DeleteCommands, useValue: commands },
      ],
    });
    await beans.load([alpha, storedBean('beta', { name: 'Beta' })]);
    await brews.load([
      storedBrew('alpha', 18, 3),
      storedBrew('beta', 30, 2),
      storedBrew('alpha', 18.5, 1),
    ]);
  });

  async function render(
    bean: IBean | Bean,
    inputs: Record<string, unknown> = {},
  ): Promise<ComponentFixture<BeanInformationComponent>> {
    const fixture = TestBed.createComponent(BeanInformationComponent);
    fixture.componentRef.setInput('bean', bean);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    return fixture;
  }

  function value(
    fixture: ComponentFixture<BeanInformationComponent>,
    label: string,
  ): string {
    const element = fixture.nativeElement as HTMLElement;
    // Ionic hides the text of a label from textContent.
    // Whitespace is compared as a reader sees it, as in the E2E helper.
    const normalize = (content: string) => content.replace(/\s+/g, ' ').trim();
    const headline = [
      ...element.querySelectorAll('ion-label.card-headline'),
    ].find(
      (node) =>
        normalize(node.innerHTML.replace(/<!--[\s\S]*?-->/g, '')) === label,
    );
    return normalize(
      headline?.parentElement?.querySelector('ion-text')?.textContent ?? '',
    );
  }

  function text(fixture: ComponentFixture<BeanInformationComponent>): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('shows the stored bean, not the copy it was handed', async () => {
    const stale = legacyBean(alpha);
    stale.name = 'Unsaved change';

    const fixture = await render(stale);

    expect(text(fixture)).toContain('Alpha');
    expect(text(fixture)).not.toContain('Unsaved change');
    expect(value(fixture, 'PAGE_HOME_TOTAL_BREWS')).toBe('2');
    expect(value(fixture, 'ROASTED_BEFORE')).toBe('10 DAYS_OLD');
    expect(value(fixture, 'BREW_DATA_FLAVOR')).toBe('Honey,CUPPING_1');
    expect(value(fixture, 'BEAN_DATA_COST')).toBe('12.5 (50 €/kg)');
    expect(value(fixture, 'BEAN_DATA_ROAST_NAME_TYPE')).toBe('-');
    expect(text(fixture)).not.toContain('BEAN_ROASTING_TYPE_');
  });

  it('shows a bean that is not stored as it was handed in', async () => {
    const preview = storedBean('preview', {
      name: 'Preview',
      roast: 'CUSTOM_ROAST' as never,
      roast_custom: 'House',
      bean_roasting_type: 'FILTER' as never,
      frozenDate: new Date(NOW - DAY).toISOString(),
      unfrozenDate: new Date(NOW).toISOString(),
      bean_roast_information: { bean_uuid: 'green' } as never,
      roastingDate: new Date(NOW - 2 * DAY).toISOString(),
    });

    const fixture = await render(preview);

    expect(text(fixture)).toContain('Preview');
    expect(text(fixture)).toContain('(BEAN_ROASTING_TYPE_FILTER)');
    expect(value(fixture, 'PAGE_HOME_TOTAL_BREWS')).toBe('0');
    expect(value(fixture, 'ROASTED_BEFORE')).toBe('1 DAY_OLD');
    expect(value(fixture, 'BEAN_DATA_ROAST_NAME_TYPE')).toBe('House');
    expect(
      fixture.nativeElement.querySelector('ion-icon[name="flame-outline"]'),
    ).not.toBeNull();
  });

  it('names the options after the bean with the roaster and the roasting date it shows', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      A11Y: { OPTIONS_FOR: 'Options for {{name}}' },
    });
    translate.use('en');
    settings.date_format = 'DD.MM.YYYY';
    const bean = storedBean('gamma', {
      name: 'Brazil Cerrado',
      roaster: 'Hill',
      roastingDate: '2026-02-19T08:00:00.000Z',
    });
    // Ionic moves the name of ion-button to the button in its shadow root.
    const options = async (
      fixture: ComponentFixture<BeanInformationComponent>,
    ) => {
      const button = (fixture.nativeElement as HTMLElement)
        .querySelector('ion-icon[name="beanconqueror-dots"]')
        .closest('ion-button');
      await new Promise((resolve) => setTimeout(resolve));
      return (
        button.shadowRoot
          ?.querySelector('button')
          ?.getAttribute('aria-label') ?? button.getAttribute('aria-label')
      );
    };

    expect(await options(await render(bean))).toBe(
      'Options for Brazil Cerrado, Hill, 19.02.2026',
    );
    expect(await options(await render(bean, { collapsed: true }))).toBe(
      'Options for Brazil Cerrado',
    );
  });

  it('shows the QR symbol only for a bean with a code', async () => {
    const symbol = (fixture: ComponentFixture<BeanInformationComponent>) =>
      (fixture.nativeElement as HTMLElement).querySelector(
        'ion-icon[name="qr-code-outline"]',
      );

    expect(symbol(await render(legacyBean(alpha)))).not.toBeNull();
    for (const qr_code of [null, undefined, '']) {
      const unscanned = storedBean('unscanned', { qr_code });

      expect(symbol(await render(unscanned))).toBeNull();
    }
  });

  it('follows a brew saved elsewhere and a change of the bean', async () => {
    const fixture = await render(legacyBean(alpha));

    brews.change([...brews.entries, storedBrew('alpha', 20, 0)]);
    await fixture.whenStable();

    expect(value(fixture, 'PAGE_HOME_TOTAL_BREWS')).toBe('3');

    beans.change([
      storedBean('alpha', { ...alpha, roast: 'CITY_ROAST' as never }),
    ]);
    await fixture.whenStable();

    expect(value(fixture, 'BEAN_DATA_ROAST_NAME_TYPE')).toBe('City roast');
  });

  it('shows the grams used and what is left of the bag', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      BEAN_WEIGHT_ALREADY_USED:
        '{{gramUsed}} used of {{gramTotal}}, {{leftOver}} left',
    });
    translate.use('en');

    const fixture = await render(legacyBean(alpha));

    expect(value(fixture, 'BEANS_AMOUNT_USED')).toBe(
      '36.5 used of 250, 213.5 left',
    );
  });

  it('stops the age of an archived bean on the day of its last brew', async () => {
    beans.change([storedBean('alpha', { ...alpha, finished: true })]);

    const fixture = await render(legacyBean(alpha));

    expect(value(fixture, 'ROASTED_BEFORE')).toBe('9 DAYS_OLD');
  });

  /**
   * The card in English, as the user reads it, with the settings of a new
   * user: only the varieties are switched on beyond the defaults.
   */
  function inEnglish(): void {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en);
    translate.use('en');
    settings.date_format = 'DD.MM.YYYY';
    settings.currency = 'EUR';
    settings.bean_visible_list_view_parameters = Object.assign(
      new BeanListViewParameter(),
      { bean_information: true, country: true, percentage: true },
    );
  }

  it('shows the brews, the usage and the age of a bean', async () => {
    inEnglish();
    beans.change([
      storedBean('alpha', {
        name: 'Alpha Filter',
        roaster: 'Rösterei Nord',
        roastingDate: new Date(NOW - 10 * DAY).toISOString(),
        weight: 250,
        cost: 12.5,
      }),
      // Known defect: a bean without a roasting date is "0 days old".
      storedBean('ethiopia', { name: 'Äthiopien', weight: 0 }),
      // Known defect: more used than the bag held leaves a negative rest.
      storedBean('overused', {
        name: 'Delta Minus',
        weight: 100,
        roastingDate: new Date(NOW - 20 * DAY).toISOString(),
      }),
    ]);
    brews.change([
      storedBrew('alpha', 18, 3),
      // The weight of the beans put in counts instead of the ground weight.
      { ...storedBrew('alpha', 18, 1), bean_weight_in: 18.5 },
      ...[6, 5, 4].map((days) => storedBrew('overused', 40, days)),
    ]);

    const alphaCard = await render(beans.entries[0] as IBean);
    expect(value(alphaCard, 'Roast date')).toBe('19.02.2026');
    expect(value(alphaCard, 'Roaster')).toBe('Rösterei Nord');
    expect(value(alphaCard, 'Brews')).toBe('2');
    expect(value(alphaCard, 'Roasted before')).toBe('10 days old');
    expect(value(alphaCard, 'Consumed')).toBe('36.5g of 250g (213.5g)');
    expect(value(alphaCard, 'Cost')).toBe('12.5 (50 €/kg)');

    const ethiopia = await render(beans.entries[1] as IBean);
    expect(value(ethiopia, 'Roast date')).toBe('-');
    expect(value(ethiopia, 'Roasted before')).toBe('0 days old');
    expect(value(ethiopia, 'Consumed')).toBe('0g of 0g (0g)');

    const overused = await render(beans.entries[2] as IBean);
    expect(value(overused, 'Consumed')).toBe('120g of 100g (-20g)');
  });

  it('numbers the fields of the varieties of a blend', async () => {
    inEnglish();
    const blend = storedBean('blend', {
      name: 'Gamma Blend',
      beanMix: 'BLEND' as never,
      bean_information: [
        { country: 'Ethiopia', percentage: 50 },
        { country: 'Brazil', percentage: 30 },
        { country: 'Colombia', percentage: 20 },
      ] as never,
    });
    beans.change([blend]);

    const fixture = await render(blend);

    expect(value(fixture, 'Bean mix')).toBe('Blend');
    for (const [index, country, percentage] of [
      [1, 'Ethiopia', '50'],
      [2, 'Brazil', '30'],
      [3, 'Colombia', '20'],
    ] as const) {
      expect(value(fixture, `${index}. Country`)).toBe(country);
      expect(value(fixture, `${index}. Percentage`)).toBe(percentage);
    }
  });

  it('names the only variety of a single origin bean without a number', async () => {
    inEnglish();
    const single = storedBean('single', {
      name: 'Gamma Blend',
      beanMix: 'SINGLE_ORIGIN' as never,
      bean_information: [{ country: 'Ethiopia', percentage: 50 }] as never,
    });
    beans.change([single]);

    const fixture = await render(single);

    expect(value(fixture, 'Country')).toBe('Ethiopia');
    expect(value(fixture, '1. Country')).toBe('');
    expect(value(fixture, '2. Country')).toBe('');
  });

  /** The names of the symbols a screen reader speaks, in their order. */
  function symbols(
    fixture: ComponentFixture<BeanInformationComponent>,
  ): string[] {
    return [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll(
        'ion-icon[aria-label]',
      ),
    ].map((icon) => icon.getAttribute('aria-label'));
  }

  /** The frozen ids on the cards, from top to bottom. */
  function frozenIds(
    fixture: ComponentFixture<BeanInformationComponent>,
  ): string[] {
    return [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll(
        '.frozen-id-label',
      ),
    ].map((label) => label.textContent.trim());
  }

  /**
   * An attribute of ion-button, which Ionic moves to its inner button once it
   * has rendered again.
   */
  async function buttonAttribute(
    button: Element,
    name: string,
  ): Promise<string | null> {
    for (let frame = 0; frame < 3; frame++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return (
      button.shadowRoot?.querySelector('button')?.getAttribute(name) ??
      button.getAttribute(name)
    );
  }

  it('shows when a bean was frozen, its note and its id with spoken symbols', async () => {
    inEnglish();
    // 10 days until it was frozen; 90 days in the freezer count as one.
    const frozen = storedBean('frozen', {
      name: 'Eta Frost',
      roastingDate: new Date(NOW - 210 * DAY).toISOString(),
      frozenDate: new Date(NOW - 200 * DAY).toISOString(),
      frozenId: 'EF1',
      frozenNote: 'Vakuumiert',
    });
    beans.change([frozen]);

    const fixture = await render(frozen);

    expect(value(fixture, 'Frozen date')).toBe('13.08.2025');
    expect(value(fixture, 'Roasted before')).toBe('12 days old');
    expect(value(fixture, 'Frozen notes')).toBe('Vakuumiert');
    expect(frozenIds(fixture)).toEqual(['EF1']);
    expect(symbols(fixture)).toEqual(['Frozen', 'Frozen id']);
  });

  it('marks a group card, names its toggle and shows each portion with its options', async () => {
    inEnglish();
    const portions = ['ZP1', 'ZP2', 'ZP3'].map((frozenId) =>
      storedBean(frozenId, {
        name: 'Zeta Portion',
        frozenDate: new Date(NOW - 30 * DAY).toISOString(),
        frozenId,
        frozenGroupId: 'zeta',
      }),
    );
    beans.change(portions);
    const group: BeanGroup = {
      frozenGroupId: 'zeta',
      beans: portions.map(legacyBean),
    };
    const fixture = await render(group.beans[0], { beanGroup: group });
    const element = fixture.nativeElement as HTMLElement;
    const toggle = element.querySelector('.ion-text-center ion-button');
    const options = () =>
      element.querySelectorAll('ion-icon[name="beanconqueror-dots"]').length;

    // The first portion stands for the group.
    expect(symbols(fixture)).toEqual(['Bean group', 'Frozen', 'Frozen id']);
    expect(frozenIds(fixture)).toEqual(['ZP1']);
    expect(await buttonAttribute(toggle, 'aria-label')).toBe(
      'Beans in the group Zeta Portion',
    );
    expect(await buttonAttribute(toggle, 'aria-expanded')).toBe('false');
    expect(options()).toBe(1);

    fixture.componentRef.setInput('groupExpanded', true);
    await fixture.whenStable();

    expect(await buttonAttribute(toggle, 'aria-expanded')).toBe('true');
    expect(frozenIds(fixture)).toEqual(['ZP1', 'ZP2', 'ZP3']);
    expect(options()).toBe(3);
  });

  it('ends the age of an archived bean with its last brew, also when it was frozen later', async () => {
    const archived = storedBean('archived', {
      finished: true,
      roastingDate: new Date(NOW - 60 * DAY).toISOString(),
    });
    // Known defect: the days until it was frozen count although the last
    // brew was before that.
    const archivedLate = storedBean('late', {
      finished: true,
      roastingDate: new Date(NOW - 50 * DAY).toISOString(),
      frozenDate: new Date(NOW - 20 * DAY).toISOString(),
      frozenId: 'LA1',
    });
    beans.change([archived, archivedLate]);
    brews.change([storedBrew('archived', 15, 40), storedBrew('late', 15, 45)]);

    expect(value(await render(archived), 'ROASTED_BEFORE')).toBe('20 DAYS_OLD');
    expect(value(await render(archivedLate), 'ROASTED_BEFORE')).toBe(
      '29 DAYS_OLD',
    );
  });

  it('moves the stars when the stored rating changes', async () => {
    const fixture = await render(legacyBean(alpha));
    const [roastStars, ratingStars] = fixture.debugElement
      .queryAll((node) => node.name === 'ngx-stars')
      .map((node) => node.componentInstance as NgxStarsComponent);
    expect(ratingStars.rating).toBe(4);

    beans.change([
      storedBean('alpha', { ...alpha, rating: 2, roast_range: 1 }),
    ]);
    await fixture.whenStable();

    expect(roastStars.rating).toBe(1);
    expect(ratingStars.rating).toBe(2);
  });

  it('counts brews without going through all brews for each card', async () => {
    const read = spyOn(brews, 'getRawEntries').and.callThrough();
    for (const bean of [alpha, beans.entries[1] as IBean, alpha]) {
      await render(legacyBean(bean));
    }

    expect(read).toHaveBeenCalledTimes(1);
    expect(brews.getAllEntries).not.toHaveBeenCalled();
    expect(helper.getAllBrewsForThisBean).not.toHaveBeenCalled();
  });

  it('asks to open a group and shows its cards while it is open', async () => {
    const group: BeanGroup = {
      frozenGroupId: 'g',
      beans: [legacyBean(alpha), legacyBean(beans.entries[1] as IBean)],
    };
    const fixture = await render(group.beans[0], { beanGroup: group });
    const element = fixture.nativeElement as HTMLElement;
    const toggle = () =>
      element.querySelector<HTMLElement>('.ion-text-center ion-button');
    let toggled = 0;
    fixture.componentInstance.groupToggled.subscribe(() => toggled++);

    toggle()?.click();
    await fixture.whenStable();

    // The list keeps the state, so the card stays closed until it is told.
    expect(toggled).toBe(1);
    expect(element.querySelectorAll('bean-information').length).toBe(0);

    fixture.componentRef.setInput('groupExpanded', true);
    await fixture.whenStable();

    expect(element.querySelectorAll('bean-information').length).toBe(1);
    expect(text(fixture)).toContain('Beta');
  });

  describe('actions', () => {
    let fixture: ComponentFixture<BeanInformationComponent>;
    let card: BeanInformationComponent;
    let emitted: BeanActionEvent[];
    const event = () => new Event('click');

    beforeEach(async () => {
      fixture = await render(legacyBean(alpha));
      card = fixture.componentInstance;
      emitted = [];
      card.beanAction.subscribe((value) => emitted.push(value));
    });

    function choose(role: BEAN_ACTION | undefined) {
      modal.create.and.resolveTo({
        present: () => Promise.resolve(),
        onWillDismiss: () => Promise.resolve({ role }),
      });
    }

    /** The bean handed to legacy code by the last call of `spy`. */
    function handed(spy: jasmine.Spy): Bean {
      return spy.calls.mostRecent().args[0] as Bean;
    }

    it('give legacy code a changeable copy of the stored bean', async () => {
      choose(BEAN_ACTION.DETAIL);
      await card.showBeanActions(event());

      const bean = handed(helper.detailBean);
      expect(bean).toBeInstanceOf(Bean);
      expect(bean.name).toBe('Alpha');
      expect(Object.isFrozen(bean)).toBeFalse();
      expect(bean).not.toBe(beans.entries[0] as never);
      expect(emitted).toEqual([[BEAN_ACTION.DETAIL, bean]]);
      expect(emitted[0][1]).toBe(bean);
    });

    it('send the bean as legacy code left it, once the action is done', async () => {
      helper.editBean.and.callFake(async (bean: Bean) => {
        expect(emitted).toEqual([]);
        bean.name = 'Edited';
      });
      choose(BEAN_ACTION.EDIT);
      await card.showBeanActions(event());

      expect(emitted.length).toBe(1);
      expect(emitted[0][1]).toBe(handed(helper.editBean));
      expect(emitted[0][1].name).toBe('Edited');
    });

    it('give legacy code a copy that shares nothing with the store', async () => {
      const stored = TestBed.inject(BeanStore).byUuid().get('alpha');
      choose(BEAN_ACTION.DETAIL);
      await card.showBeanActions(event());

      const bean = handed(helper.detailBean);
      expect(bean).not.toBe(stored as never);
      expect(bean.config).not.toBe(stored.config);
      expect(bean.attachments).not.toBe(stored.attachments as never);
      expect(bean.cupped_flavor.custom_flavors).not.toBe(
        stored.cupped_flavor.custom_flavors as never,
      );
      // Legacy dialogs write into the copy at every depth.
      bean.config.uuid = 'changed';
      bean.attachments.push('second.jpg');
      bean.cupped_flavor.custom_flavors.push('Plum');
      expect(stored.config.uuid).toBe('alpha');
      expect(stored.attachments).toEqual(['photo.jpg']);
      expect(stored.cupped_flavor.custom_flavors).toEqual(['Honey']);
    });

    it('do nothing when the menu is closed', async () => {
      choose(undefined);
      await card.showBeanActions(event());

      expect(emitted).toEqual([]);
    });

    it('do nothing when the menu is closed by a tap beside it', async () => {
      choose('backdrop' as BEAN_ACTION);
      await card.showBeanActions(event());

      expect(emitted).toEqual([]);
      const { getAllBrewsForThisBean, ...actions } = helper;
      expect(getAllBrewsForThisBean).toHaveBeenCalled();
      for (const spy of [
        ...Object.values(actions),
        ...Object.values(brewHelper),
        ...Object.values(share),
        ...Object.values(image),
        alert.showConfirm,
        uiHelper.copyToClipboard,
        beans.update,
        beanWrites,
        commands.deleteBean,
      ]) {
        expect(spy).not.toHaveBeenCalled();
      }
    });

    const A = BEAN_ACTION;

    /** The menu exactly as it is handed to the popover. */
    async function menu(): Promise<string[][]> {
      choose(undefined);
      await card.showBeanActions(event());

      const items = (
        modal.create.calls.mostRecent().args[0] as unknown as {
          componentProps: { items: Record<string, unknown>[] };
        }
      ).componentProps.items;
      // The popover shows every entry without a flag that hides it.
      expect(items.every((item) => !('visible' in item))).toBeTrue();
      expect(items.every((item) => item.itemType === 'action')).toBeTrue();
      return items.map((item) => [
        item.role as string,
        item.translationKey as string,
        item.icon as string,
      ]);
    }

    async function offered(): Promise<string[]> {
      return (await menu()).map(([role]) => role);
    }

    it('list the actions of a bean in stock in a fixed order', async () => {
      helper.getAllBrewsForThisBean.and.returnValue([activeBrew(1)]);

      expect(await menu()).toEqual([
        [A.DETAIL, 'DETAIL', 'beanconqueror-detail'],
        [A.REPEAT, 'REPEAT', 'beanconqueror-repeat'],
        [A.EDIT, 'EDIT', 'beanconqueror-edit'],
        [
          A.REPEAT_LAST_OR_BEST_BREW,
          'POPOVER_BEANS_OPTION_REPEAT',
          'beanconqueror-repeat',
        ],
        [A.SHOW_BREWS, 'POPOVER_SHOW_BREWS', 'beanconqueror-brew'],
        [A.CUPPING, 'POPOVER_BREWS_OPTION_CUPPING', 'beanconqueror-cupping'],
        [A.FREEZE, 'POPOVER_FREEZE_COFFEE_BEAN', 'snow-outline'],
        [A.COPY_FROZEN_ID, 'POPOVER_COPY_FROZEN_ID', 'copy-outline'],
        [
          A.REFRESH_DATA_FROM_QR_CODE,
          'POPOVER_QR_CODE_REFRESH',
          'beanconqueror-refresh-barcode',
        ],
        [
          A.TOGGLE_FAVOURITE,
          'POPOVER_BREWS_OPTION_TOGGLE_FAVOURITE',
          'heart-outline',
        ],
        [A.SHARE, 'SHARE_BEAN_URL', 'share-social-outline'],
        [A.SHARE_IMAGE, 'SHARE_CARD.MENU', 'images-outline'],
        [A.BEANS_CONSUMED, 'BEANS_CONSUMED', 'beanconqueror-finished'],
        [
          A.PHOTO_GALLERY,
          'POPOVER_BREWS_OPTION_PHOTO_GALLERY',
          'beanconqueror-photo-gallery',
        ],
        [
          A.GENERATE_INTERNAL_SHARE_CODE,
          'POPOVER_BEAN_OPTION_GENERATE_INTERNAL_SHARE_CODE',
          'qr-code-outline',
        ],
        [A.DELETE, 'DELETE', 'beanconqueror-delete'],
      ]);
      expect(helper.getAllBrewsForThisBean.calls.allArgs()).toEqual([
        ['alpha'],
      ]);
    });

    it('list the actions of a frozen, archived favourite in a fixed order', async () => {
      beans.change([
        storedBean('alpha', {
          ...alpha,
          finished: true,
          favourite: true,
          frozenDate: new Date(NOW - DAY).toISOString(),
        }),
      ]);
      helper.getAllBrewsForThisBean.and.returnValue([activeBrew(1)]);

      expect((await menu()).map(([role, , icon]) => [role, icon])).toEqual([
        [A.DETAIL, 'beanconqueror-detail'],
        [A.REPEAT, 'beanconqueror-repeat'],
        [A.EDIT, 'beanconqueror-edit'],
        [A.REPEAT_LAST_OR_BEST_BREW, 'beanconqueror-repeat'],
        [A.SHOW_BREWS, 'beanconqueror-brew'],
        [A.CUPPING, 'beanconqueror-cupping'],
        [A.UNFREEZE, 'thermometer-outline'],
        [A.COPY_FROZEN_ID, 'copy-outline'],
        [A.REFRESH_DATA_FROM_QR_CODE, 'beanconqueror-refresh-barcode'],
        [A.TOGGLE_FAVOURITE, 'heart'],
        [A.SHARE, 'share-social-outline'],
        [A.SHARE_IMAGE, 'images-outline'],
        [A.UNARCHIVE, 'beanconqueror-unfinish'],
        [A.PHOTO_GALLERY, 'beanconqueror-photo-gallery'],
        [A.GENERATE_INTERNAL_SHARE_CODE, 'qr-code-outline'],
        [A.DELETE, 'beanconqueror-delete'],
      ]);
    });

    it('offer no gallery and show no photo for a bean without one', async () => {
      const photo = () =>
        (fixture.nativeElement as HTMLElement).querySelector('async-image');
      expect(photo()).not.toBeNull();

      beans.change([storedBean('alpha', { ...alpha, attachments: [] })]);
      await fixture.whenStable();

      const items = await menu();
      // The popover shows the entries by their translation keys.
      expect(items).toContain([A.DETAIL, 'DETAIL', 'beanconqueror-detail']);
      expect(items.map(([role]) => role)).not.toContain(A.PHOTO_GALLERY);
      expect(items.map(([, key]) => key)).not.toContain(
        'POPOVER_BREWS_OPTION_PHOTO_GALLERY',
      );
      expect(photo()).toBeNull();
    });

    for (const stored of [false, undefined]) {
      it(`offer no freezing when the setting is ${stored}`, async () => {
        settings.freeze_coffee_beans = stored;

        const visible = await offered();

        expect(visible).not.toContain(A.FREEZE);
        expect(visible).not.toContain(A.UNFREEZE);
      });
    }

    const repeatable: [string, BrewPart | undefined, boolean][] = [
      ['a brew with nothing archived', undefined, true],
      ['a brew with an archived bean', 'getBean', false],
      ['a brew with an archived grinder', 'getMill', false],
      ['a brew with an archived preparation', 'getPreparation', false],
    ];
    for (const [name, archived, expected] of repeatable) {
      it(`offer to repeat a brew: ${name}`, async () => {
        helper.getAllBrewsForThisBean.and.returnValue([
          activeBrew(1, false, archived),
        ]);

        expect((await offered()).includes(A.REPEAT_LAST_OR_BEST_BREW)).toBe(
          expected,
        );
      });
    }

    it('hide the repeat of a brew when the brew lookup fails', async () => {
      helper.getAllBrewsForThisBean.and.throwError('broken');

      expect(await offered()).not.toContain(A.REPEAT_LAST_OR_BEST_BREW);
      expect(modal.create).toHaveBeenCalled();
    });

    const frozen = { frozenDate: new Date(NOW - DAY).toISOString() };
    const delegated: [BEAN_ACTION, () => jasmine.Spy, Partial<IBean>?][] = [
      [BEAN_ACTION.REPEAT, () => helper.repeatBean],
      [BEAN_ACTION.EDIT, () => helper.editBean],
      [BEAN_ACTION.CUPPING, () => helper.cupBean],
      [BEAN_ACTION.PHOTO_GALLERY, () => image.viewPhotos],
      [BEAN_ACTION.SHARE, () => share.shareBean],
      [BEAN_ACTION.FREEZE, () => helper.freezeBean],
      [BEAN_ACTION.UNFREEZE, () => helper.unfreezeBean, frozen],
      [BEAN_ACTION.GENERATE_INTERNAL_SHARE_CODE, () => helper.generateQRCode],
      [BEAN_ACTION.BEANS_CONSUMED, () => helper.archiveBeanWithRatingQuestion],
    ];
    for (const [action, spy, fields] of delegated) {
      it(`hand the bean on for ${action}`, async () => {
        beans.change([storedBean('alpha', { ...alpha, ...fields })]);
        choose(action);
        await card.showBeanActions(event());

        expect(handed(spy()).config.uuid).toBe('alpha');
      });
    }

    it('copy the frozen id and show the brews', async () => {
      choose(BEAN_ACTION.COPY_FROZEN_ID);
      await card.showBeanActions(event());
      choose(BEAN_ACTION.SHOW_BREWS);
      await card.showBeanActions(event());
      choose('UNKNOWN' as BEAN_ACTION);
      await card.showBeanActions(event());

      expect(uiHelper.copyToClipboard).toHaveBeenCalledWith('F1');
      expect(brewHelper.showAssociatedBrews).toHaveBeenCalledWith(
        'alpha',
        'bean',
      );
    });

    it('toggle the favourite with the same toasts and tracking', async () => {
      const stored = () => beans.entries[0] as IBean;
      const tracked = (): unknown[] =>
        analytics.trackEvent.calls.mostRecent().args;
      choose(BEAN_ACTION.TOGGLE_FAVOURITE);
      await card.showBeanActions(event());

      expect(stored().favourite).toBeTrue();
      expect(stored().name).toBe('Alpha');
      expect(beanWrites).toHaveBeenCalledTimes(1);
      expect(toast.showInfoToast.calls.allArgs()).toEqual([
        ['TOAST_BEAN_FAVOURITE_ADDED'],
      ]);
      expect(tracked()).toEqual([
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.ADD_FAVOURITE,
      ]);

      await card.showBeanActions(event());

      expect(stored().favourite).toBeFalse();
      expect(toast.showInfoToast.calls.mostRecent().args).toEqual([
        'TOAST_BEAN_FAVOURITE_REMOVED',
      ]);
      expect(tracked()).toEqual([
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.REMOVE_FAVOURITE,
      ]);
    });

    it('take an archived bean back with the same toast and tracking', async () => {
      beans.change([storedBean('alpha', { ...alpha, finished: true })]);
      choose(BEAN_ACTION.UNARCHIVE);
      await card.showBeanActions(event());

      expect((beans.entries[0] as IBean).finished).toBeFalse();
      expect(beanWrites).toHaveBeenCalledTimes(1);
      expect(toast.showInfoToast.calls.allArgs()).toEqual([
        ['TOAST_BEAN_UNARCHIVED_SUCCESSFULLY'],
      ]);
      expect(analytics.trackEvent).toHaveBeenCalledWith(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.UNARCHIVE,
      );
      expect(settingsStorage.saveSettings.calls.count()).toBe(1);
    });

    it('thaw a bean without weight at once', async () => {
      beans.change([storedBean('alpha', { ...alpha, ...frozen, weight: 0 })]);
      choose(BEAN_ACTION.UNFREEZE);
      await card.showBeanActions(event());

      expect(handed(beans.update).unfrozenDate).toMatch(/^\d{4}-/);
      expect(helper.unfreezeBean).not.toHaveBeenCalled();
    });

    describe('delete the bean and its brews', () => {
      /** What happened, in order. */
      let steps: string[];

      beforeEach(() => {
        steps = [];
        const step = (name: string, spy: jasmine.Spy, result?: unknown) =>
          spy.and.callFake(() => {
            steps.push(name);
            return result;
          });
        // Like the real one: the spinner is hidden when the work has ended,
        // also by an error.
        alert.withLoadingSpinner.and.callFake(
          async <T>(work: () => T | Promise<T>) => {
            steps.push('spinner shown');
            try {
              return await work();
            } finally {
              steps.push('spinner hidden');
            }
          },
        );
        analytics.trackEvent.and.callFake((_title: string, action: string) => {
          if (action === BEAN_TRACKING.ACTIONS.DELETE) {
            steps.push('tracked');
          }
        });
        step('toast', toast.showInfoToast);
        step('message', alert.showMessage, Promise.resolve());
        settingsStorage.saveSettings.and.callFake(() => {
          steps.push('filters reset');
          return Promise.resolve() as never;
        });
        alert.showConfirm.and.resolveTo('YES');
        choose(BEAN_ACTION.DELETE);
      });

      function command(result: Promise<Deletion>) {
        commands.deleteBean.and.callFake(() => {
          steps.push('command');
          return result;
        });
      }

      it('not without a yes to the question', async () => {
        alert.showConfirm.and.resolveTo('NO');
        await card.showBeanActions(event());

        expect(commands.brewCount).toHaveBeenCalledOnceWith('bean', 'alpha');
        expect(alert.showConfirm).toHaveBeenCalledOnceWith(
          'DELETE_BEAN_QUESTION_ONE',
          'SURE_QUESTION',
          true,
          { count: 1 },
        );
        expect(commands.deleteBean).not.toHaveBeenCalled();
        expect(steps).toEqual([]);
        expect(emitted.map(([action]) => action)).toEqual([BEAN_ACTION.DELETE]);
      });

      it('with a toast and all filters reset once it is done', async () => {
        settings.bean_filter.OPEN.favourite = true;
        command(Promise.resolve('deleted'));
        await card.showBeanActions(event());

        expect(commands.deleteBean).toHaveBeenCalledOnceWith('alpha');
        expect(steps).toEqual([
          'spinner shown',
          'tracked',
          'command',
          'toast',
          'filters reset',
          'spinner hidden',
        ]);
        expect(alert.withLoadingSpinner.calls.mostRecent().args[1]).toBe(
          'PLEASE_WAIT_DO_NOT_CLOSE_APP',
        );
        expect(toast.showInfoToast).toHaveBeenCalledOnceWith(
          'TOAST_BEAN_DELETED_SUCCESSFULLY',
        );
        expect(settings.bean_filter.OPEN.favourite).toBeFalse();
        expect(alert.showMessage).not.toHaveBeenCalled();
        expect(emitted.map(([action]) => action)).toEqual([BEAN_ACTION.DELETE]);
      });

      it('with one message and nothing else when it failed', async () => {
        settings.bean_filter.OPEN.favourite = true;
        command(Promise.resolve('failed'));
        await card.showBeanActions(event());

        expect(steps).toEqual([
          'spinner shown',
          'tracked',
          'command',
          'spinner hidden',
          'message',
        ]);
        expect(alert.showMessage).toHaveBeenCalledOnceWith(
          'ERROR_OCCURED',
          'CARE',
          undefined,
          true,
        );
        expect(toast.showInfoToast).not.toHaveBeenCalled();
        expect(settings.bean_filter.OPEN.favourite).toBeTrue();
        expect(emitted.map(([action]) => action)).toEqual([BEAN_ACTION.DELETE]);
      });

      it('with no message of its own when the user was told about the failure', async () => {
        settings.bean_filter.OPEN.favourite = true;
        command(Promise.resolve('reported'));
        await card.showBeanActions(event());

        expect(steps).toEqual([
          'spinner shown',
          'tracked',
          'command',
          'spinner hidden',
        ]);
        expect(alert.showMessage).not.toHaveBeenCalled();
        expect(toast.showInfoToast).not.toHaveBeenCalled();
        expect(settings.bean_filter.OPEN.favourite).toBeTrue();
      });

      it('hides the spinner when deleting throws', async () => {
        command(Promise.reject(new Error('unexpected')));

        await expectAsync(card.showBeanActions(event())).toBeRejected();

        expect(steps).toEqual([
          'spinner shown',
          'tracked',
          'command',
          'spinner hidden',
        ]);
        expect(toast.showInfoToast).not.toHaveBeenCalled();
      });
    });

    describe('repeat the last or the best brew', () => {
      const last = activeBrew(300);
      const best = activeBrew(100, true);

      beforeEach(() => choose(BEAN_ACTION.REPEAT_LAST_OR_BEST_BREW));

      interface Sheet {
        header: string;
        buttons: { text: string; handler: () => Promise<void> }[];
      }
      let present: jasmine.Spy;

      /** Opens the sheet and takes its first, then its second button. */
      async function chooseBothInTurn(): Promise<Sheet> {
        let sheet: Sheet;
        present = jasmine.createSpy('present').and.resolveTo();
        actionSheet.create.and.callFake(async (options: Sheet) => {
          sheet = options;
          return { present } as never;
        });

        await card.showBeanActions(event());
        await sheet.buttons[0].handler();
        await sheet.buttons[1].handler();
        return sheet;
      }

      it('ask which one when there is a best brew', async () => {
        helper.getAllBrewsForThisBean.and.returnValue([best, last]);

        const sheet = await chooseBothInTurn();

        expect(present).toHaveBeenCalledTimes(1);
        expect(sheet.header).toBe('CHOOSE');
        expect(sheet.buttons.map((button) => button.text)).toEqual([
          'REPEAT_LAST_BREW',
          'REPEAT_BEST_BREW',
        ]);
        expect(brewHelper.repeatBrew.calls.allArgs()).toEqual([[last], [best]]);
      });

      it('repeat the last one without a best brew', async () => {
        helper.getAllBrewsForThisBean.and.returnValue([activeBrew(1), last]);

        await card.showBeanActions(event());

        expect(brewHelper.repeatBrew).toHaveBeenCalledOnceWith(last);
        // Once for the menu, once for the repeat.
        expect(helper.getAllBrewsForThisBean.calls.allArgs()).toEqual([
          ['alpha'],
          ['alpha'],
        ]);
      });

      it('do nothing without brews', async () => {
        await card.showBeanActions(event());

        expect(brewHelper.repeatBrew).not.toHaveBeenCalled();
      });

      it('repeat the last one when best brews are switched off', async () => {
        settings.best_brew = false;
        helper.getAllBrewsForThisBean.and.returnValue([best, last]);

        await card.showBeanActions(event());

        expect(actionSheet.create).not.toHaveBeenCalled();
        expect(brewHelper.repeatBrew).toHaveBeenCalledOnceWith(last);
      });

      it('take the latest of several best brews, even as the last brew', async () => {
        const latestBest = activeBrew(400, true);
        helper.getAllBrewsForThisBean.and.returnValue([best, latestBest, last]);

        await chooseBothInTurn();

        expect(brewHelper.repeatBrew.calls.allArgs()).toEqual([
          [latestBest],
          [latestBest],
        ]);
      });

      it('leave out a best brew with an archived part', async () => {
        helper.getAllBrewsForThisBean.and.returnValue([
          activeBrew(500, true, 'getMill'),
          last,
        ]);

        await card.showBeanActions(event());

        expect(actionSheet.create).not.toHaveBeenCalled();
        expect(brewHelper.repeatBrew).toHaveBeenCalledOnceWith(last);
      });

      it('do nothing when every brew has an archived part', async () => {
        helper.getAllBrewsForThisBean.and.returnValue([
          activeBrew(500, true, 'getPreparation'),
        ]);

        await card.showBeanActions(event());

        expect(actionSheet.create).not.toHaveBeenCalled();
        expect(brewHelper.repeatBrew).not.toHaveBeenCalled();
      });

      it('pass on the error of a brew lookup that fails after the menu', async () => {
        let lookups = 0;
        helper.getAllBrewsForThisBean.and.callFake(() => {
          if (lookups++ > 0) {
            throw new Error('broken');
          }
          return [last];
        });

        await expectAsync(card.showBeanActions(event())).toBeRejectedWithError(
          'broken',
        );
        expect(emitted).toEqual([]);
      });
    });

    describe('refresh from the QR code', () => {
      beforeEach(() => choose(BEAN_ACTION.REFRESH_DATA_FROM_QR_CODE));

      it('only after asking', async () => {
        alert.showConfirm.and.resolveTo('NO');

        await card.showBeanActions(event());

        expect(server.getBeanInformation).not.toHaveBeenCalled();
        expect(emitted.map(([action]) => action)).toEqual([
          BEAN_ACTION.REFRESH_DATA_FROM_QR_CODE,
        ]);
      });

      it('keeps the uuid of the bean', async () => {
        alert.showConfirm.and.resolveTo('YES');
        server.getBeanInformation.and.resolveTo({ error: null });
        const fromServer = new Bean();
        fromServer.name = 'From server';
        spyOn(BeanMapper.prototype, 'mapServerToClientBean').and.resolveTo(
          fromServer,
        );

        await card.showBeanActions(event());

        expect(handed(beans.update).name).toBe('From server');
        expect(handed(beans.update).config.uuid).toBe('alpha');
        expect(alert.showMessage).not.toHaveBeenCalled();
      });

      it('reports an error of the server', async () => {
        alert.showConfirm.and.resolveTo('YES');
        server.getBeanInformation.and.resolveTo({ error: 'gone' });

        await card.showBeanActions(event());

        expect(alert.showMessage).toHaveBeenCalled();
      });

      it('reports a failed request', async () => {
        alert.showConfirm.and.resolveTo('YES');
        server.getBeanInformation.and.rejectWith(new Error('offline'));

        await card.showBeanActions(event());

        expect(alert.showMessage).toHaveBeenCalled();
        expect(beans.update).not.toHaveBeenCalled();
      });
    });

    it('open the detail on a tap', async () => {
      await card.showBean();

      expect(handed(helper.detailBean).config.uuid).toBe('alpha');
    });

    it('open the photos on the photo', async () => {
      await card.showPhoto(event());

      expect(handed(image.viewPhotos).config.uuid).toBe('alpha');
    });

    it('edit on a long press, unless the card is disabled', async () => {
      helper.editBean.and.callFake(async () => {
        expect(emitted).toEqual([]);
      });

      await card.longPressEditBean(event());

      expect(handed(helper.editBean).config.uuid).toBe('alpha');
      expect(emitted.map(([action]) => action)).toEqual([BEAN_ACTION.EDIT]);

      fixture.componentRef.setInput('disabled', true);
      await card.longPressEditBean(event());

      expect(helper.editBean).toHaveBeenCalledTimes(1);
    });

    it('pass on the action of a card inside its group', async () => {
      const group: BeanGroup = {
        frozenGroupId: 'g',
        beans: [legacyBean(alpha), legacyBean(beans.entries[1] as IBean)],
      };
      const parent = await render(group.beans[0], {
        beanGroup: group,
        groupExpanded: true,
      });
      const fromParent: BeanActionEvent[] = [];
      parent.componentInstance.beanAction.subscribe((value) =>
        fromParent.push(value),
      );
      const child = parent.debugElement.query(
        (node) => node.name === 'bean-information',
      ).componentInstance as BeanInformationComponent;

      await child.longPressEditBean(event());

      expect(fromParent).toEqual([[BEAN_ACTION.EDIT, handed(helper.editBean)]]);
      expect(handed(helper.editBean).config.uuid).toBe('beta');
    });

    it('send the action without a warning after the card is gone', async () => {
      // Saving rebuilds the list, so a card can be gone before its dialog ends.
      helper.editBean.and.callFake(async () => fixture.destroy());
      const warn = spyOn(console, 'warn');

      await card.longPressEditBean(event());

      expect(warn).not.toHaveBeenCalled();
    });

    it('share the stored bean as a picture in its own dialog', async () => {
      const open = spyOn(BeanShareComponent, 'open').and.resolveTo();
      choose(BEAN_ACTION.SHARE_IMAGE);

      await card.showBeanActions(event());

      expect(analytics.trackEvent).toHaveBeenCalledWith(
        BEAN_TRACKING.TITLE,
        BEAN_TRACKING.ACTIONS.SHARE_IMAGE,
      );
      const [, bean, usage] = open.calls.mostRecent().args;
      expect(bean).toBe(TestBed.inject(BeanStore).byUuid().get('alpha'));
      expect(usage.brews).toBe(2);
      expect(emitted.map(([action]) => action)).toEqual([A.SHARE_IMAGE]);
    });

    it('offer the picture on the card of a frozen group as well', async () => {
      fixture.componentRef.setInput('beanGroup', {
        frozenGroupId: 'g',
        beans: [legacyBean(alpha), legacyBean(beans.entries[1] as IBean)],
      } satisfies BeanGroup);
      await fixture.whenStable();

      expect(await offered()).toContain(A.SHARE_IMAGE);
    });
  });
});
