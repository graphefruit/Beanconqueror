import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  ActionSheetController,
  ModalController,
  Platform,
} from '@ionic/angular';

import { TranslateModule } from '@ngx-translate/core';
import { NgxStarsComponent } from 'ngx-stars';
import { Subject } from 'rxjs';

import { Bean } from '../../../classes/bean/bean';
import { Brew } from '../../../classes/brew/brew';
import { Settings } from '../../../classes/settings/settings';
import { BEAN_ACTION } from '../../../enums/beans/beanAction';
import { BeanGroup } from '../../../interfaces/bean/beanGroup';
import { IBean } from '../../../interfaces/bean/iBean';
import { BeanMapper } from '../../../mapper/bean/beanMapper';
import { CurrencyService } from '../../../services/currencyService/currency.service';
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
import { FakeStoreSource } from '../../../stores/core/__tests__/fake-store-source';
import { BeanInformationComponent } from '../bean-information.component';

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

/** A brew as `getAllBrewsForThisBean` returns it, for the repeat action. */
function activeBrew(at: number, best = false): Brew {
  const brew = new Brew();
  brew.config.unix_timestamp = at;
  brew.best_brew = best;
  const active = { finished: false };
  brew.getBean = () => active as never;
  brew.getMill = () => active as never;
  brew.getPreparation = () => active as never;
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
  public removeByObject = jasmine
    .createSpy('removeByObject')
    .and.resolveTo(true);
}

class FakeBrewStorage extends FakeStoreSource {
  public getAllEntries = jasmine.createSpy('getAllEntries').and.callFake(() =>
    this.entries.map((entry) => {
      const brew = new Brew();
      brew.initializeByObject(entry as never);
      return brew;
    }),
  );
  public removeByUUID = jasmine.createSpy('removeByUUID').and.resolveTo(true);
}

/** Spies by name, to be handed in as a service. */
function spies(names: string[]): Record<string, jasmine.Spy> {
  return Object.fromEntries(
    names.map((name) => [name, jasmine.createSpy(name)]),
  );
}

describe('BeanInformationComponent', () => {
  let beans: FakeBeanStorage;
  let brews: FakeBrewStorage;
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
    brews = new FakeBrewStorage();
    settings = new Settings();
    for (const key of Object.keys(settings.bean_visible_list_view_parameters)) {
      settings.bean_visible_list_view_parameters[key] = true;
    }
    settings.freeze_coffee_beans = true;
    settings.best_brew = true;
    const settingsStorage = jasmine.createSpyObj('UISettingsStorage', [
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
    brewHelper = spies(['showAssociatedBrews', 'repeatBrew']);
    modal = spies(['create']);
    actionSheet = spies(['create']);
    server = spies(['getBeanInformation']);
    share = spies(['shareBean', 'shareImage']);
    image = spies(['viewPhotos']);
    uiHelper = spies(['toFixedIfNecessary', 'copyToClipboard']);
    uiHelper.toFixedIfNecessary.and.callFake(
      (value: number, dp: number) => +value.toFixed(dp),
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
        {
          provide: UIAnalytics,
          useValue: jasmine.createSpyObj('UIAnalytics', ['trackEvent']),
        },
        {
          provide: CurrencyService,
          useValue: { getActualCurrencySymbol: () => '€' },
        },
        { provide: Platform, useValue: { is: () => false } },
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
    const headline = [
      ...element.querySelectorAll('ion-label.card-headline'),
    ].find(
      (node) => node.innerHTML.replace(/<!--.*?-->/g, '').trim() === label,
    );
    return (
      headline?.parentElement?.querySelector('ion-text')?.textContent?.trim() ??
      ''
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
    expect(value(fixture, 'ROASTED_BEFORE')).toBe('10 DAYS_OLD');
    expect(value(fixture, 'BREW_DATA_FLAVOR')).toBe('Honey,CUPPING_1');
    expect(value(fixture, 'BEAN_DATA_COST')).toBe('12.5 (50 €/kg)');
    expect(value(fixture, 'BEAN_DATA_ROAST_NAME_TYPE')).toBe('-');
  });

  it('shows a bean that is not stored as it was handed in', async () => {
    const preview = storedBean('preview', {
      name: 'Preview',
      roast: 'CUSTOM_ROAST' as never,
      roast_custom: 'House',
      frozenDate: new Date(NOW - DAY).toISOString(),
      unfrozenDate: new Date(NOW).toISOString(),
      bean_roast_information: { bean_uuid: 'green' } as never,
      roastingDate: new Date(NOW - 2 * DAY).toISOString(),
    });

    const fixture = await render(preview);

    expect(text(fixture)).toContain('Preview');
    expect(value(fixture, 'PAGE_HOME_TOTAL_BREWS')).toBe('0');
    expect(value(fixture, 'ROASTED_BEFORE')).toBe('1 DAY_OLD');
    expect(value(fixture, 'BEAN_DATA_ROAST_NAME_TYPE')).toBe('House');
    expect(
      fixture.nativeElement.querySelector('ion-icon[name="flame-outline"]'),
    ).not.toBeNull();
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

  it('opens and closes the cards of a group', async () => {
    const group: BeanGroup = {
      frozenGroupId: 'g',
      beans: [legacyBean(alpha), legacyBean(beans.entries[1] as IBean)],
      expanded: false,
    };
    const fixture = await render(group.beans[0], { beanGroup: group });
    const element = fixture.nativeElement as HTMLElement;
    const toggle = () =>
      element.querySelector<HTMLElement>('.ion-text-center ion-button');

    toggle()?.click();
    await fixture.whenStable();

    expect(group.expanded).toBeTrue();
    expect(element.querySelectorAll('bean-information').length).toBe(1);
    expect(text(fixture)).toContain('Beta');

    toggle()?.click();
    await fixture.whenStable();

    expect(element.querySelectorAll('bean-information').length).toBe(0);
  });

  describe('actions', () => {
    let fixture: ComponentFixture<BeanInformationComponent>;
    let card: BeanInformationComponent;
    let emitted: unknown[][];
    const event = () => new Event('click');

    beforeEach(async () => {
      fixture = await render(legacyBean(alpha));
      card = fixture.componentInstance;
      emitted = [];
      card.beanAction.subscribe((value: unknown[]) => emitted.push(value));
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
    });

    it('do nothing when the menu is closed', async () => {
      choose(undefined);
      await card.showBeanActions(event());

      expect(emitted).toEqual([]);
    });

    it('offer what fits the bean', async () => {
      helper.getAllBrewsForThisBean.and.returnValue([activeBrew(1)]);
      choose(undefined);
      await card.showBeanActions(event());

      const items = (
        modal.create.calls.mostRecent().args[0] as unknown as {
          componentProps: { items: { role: string; visible?: boolean }[] };
        }
      ).componentProps.items;
      const visible = items
        .filter((item) => item.visible !== false)
        .map((item) => item.role);
      expect(visible).toContain(BEAN_ACTION.REPEAT_LAST_OR_BEST_BREW);
      expect(visible).toContain(BEAN_ACTION.FREEZE);
      expect(visible).toContain(BEAN_ACTION.COPY_FROZEN_ID);
      expect(visible).toContain(BEAN_ACTION.PHOTO_GALLERY);
      expect(visible).not.toContain(BEAN_ACTION.UNARCHIVE);
    });

    it('treat a failing brew lookup as no brews', async () => {
      helper.getAllBrewsForThisBean.and.throwError('broken');
      choose(undefined);

      await card.showBeanActions(event());

      expect(modal.create).toHaveBeenCalled();
    });

    const delegated: [BEAN_ACTION, () => jasmine.Spy][] = [
      [BEAN_ACTION.REPEAT, () => helper.repeatBean],
      [BEAN_ACTION.EDIT, () => helper.editBean],
      [BEAN_ACTION.CUPPING, () => helper.cupBean],
      [BEAN_ACTION.PHOTO_GALLERY, () => image.viewPhotos],
      [BEAN_ACTION.SHARE, () => share.shareBean],
      [BEAN_ACTION.FREEZE, () => helper.freezeBean],
      [BEAN_ACTION.UNFREEZE, () => helper.unfreezeBean],
      [BEAN_ACTION.GENERATE_INTERNAL_SHARE_CODE, () => helper.generateQRCode],
      [BEAN_ACTION.BEANS_CONSUMED, () => helper.archiveBeanWithRatingQuestion],
    ];
    for (const [action, spy] of delegated) {
      it(`hand the bean on for ${action}`, async () => {
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

    it('toggle the favourite and save the copy', async () => {
      choose(BEAN_ACTION.TOGGLE_FAVOURITE);
      await card.showBeanActions(event());

      expect(handed(beans.update).favourite).toBeTrue();
      expect(toast.showInfoToast).toHaveBeenCalledWith(
        'TOAST_BEAN_FAVOURITE_ADDED',
      );

      await card.showBeanActions(event());

      expect(handed(beans.update).favourite).toBeFalse();
      expect(toast.showInfoToast).toHaveBeenCalledWith(
        'TOAST_BEAN_FAVOURITE_REMOVED',
      );
    });

    it('take an archived bean back', async () => {
      choose(BEAN_ACTION.UNARCHIVE);
      await card.showBeanActions(event());

      expect(handed(beans.update).finished).toBeFalse();
      expect(settings.bean_filter).toBeDefined();
    });

    it('thaw a bean without weight at once', async () => {
      beans.change([storedBean('alpha', { ...alpha, weight: 0 })]);
      choose(BEAN_ACTION.UNFREEZE);
      await card.showBeanActions(event());

      expect(handed(beans.update).unfrozenDate).toMatch(/^\d{4}-/);
      expect(helper.unfreezeBean).not.toHaveBeenCalled();
    });

    it('delete the bean and its brews after asking', async () => {
      alert.showConfirm.and.resolveTo('NO');
      choose(BEAN_ACTION.DELETE);
      await card.showBeanActions(event());

      expect(beans.removeByObject).not.toHaveBeenCalled();

      alert.showConfirm.and.resolveTo('YES');
      await card.showBeanActions(event());

      expect(brews.removeByUUID).toHaveBeenCalledTimes(2);
      expect(handed(beans.removeByObject).config.uuid).toBe('alpha');
      expect(toast.showInfoToast).toHaveBeenCalledWith(
        'TOAST_BEAN_DELETED_SUCCESSFULLY',
      );
    });

    describe('repeat the last or the best brew', () => {
      const last = activeBrew(300);
      const best = activeBrew(100, true);

      beforeEach(() => choose(BEAN_ACTION.REPEAT_LAST_OR_BEST_BREW));

      it('ask which one when there is a best brew', async () => {
        helper.getAllBrewsForThisBean.and.returnValue([best, last]);
        let buttons: { handler: () => Promise<void> }[] = [];
        actionSheet.create.and.callFake(async (options) => {
          buttons = options.buttons as never;
          return { present: () => Promise.resolve() } as never;
        });

        await card.showBeanActions(event());
        await buttons[0].handler();
        await buttons[1].handler();

        expect(brewHelper.repeatBrew.calls.allArgs()).toEqual([[last], [best]]);
      });

      it('repeat the last one without a best brew', async () => {
        helper.getAllBrewsForThisBean.and.returnValue([activeBrew(1), last]);

        await card.showBeanActions(event());

        expect(brewHelper.repeatBrew).toHaveBeenCalledOnceWith(last);
      });

      it('do nothing without brews', async () => {
        await card.showBeanActions(event());

        expect(brewHelper.repeatBrew).not.toHaveBeenCalled();
      });
    });

    describe('refresh from the QR code', () => {
      beforeEach(() => choose(BEAN_ACTION.REFRESH_DATA_FROM_QR_CODE));

      it('only after asking', async () => {
        alert.showConfirm.and.resolveTo('NO');

        await card.showBeanActions(event());

        expect(server.getBeanInformation).not.toHaveBeenCalled();
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

    it('open the detail on a tap and the photos on the photo', async () => {
      await card.showBean();
      await card.showPhoto(event());

      expect(handed(helper.detailBean).config.uuid).toBe('alpha');
      expect(handed(image.viewPhotos).config.uuid).toBe('alpha');
    });

    it('edit on a long press, unless the card is disabled', async () => {
      await card.longPressEditBean(event());

      expect(handed(helper.editBean).config.uuid).toBe('alpha');
      expect(emitted.map(([action]) => action)).toEqual([BEAN_ACTION.EDIT]);

      fixture.componentRef.setInput('disabled', true);
      await card.longPressEditBean(event());

      expect(helper.editBean).toHaveBeenCalledTimes(1);
    });

    it('share an image of the card', async () => {
      const shared = new Subject<void>();
      alert.hideLoadingSpinner.and.callFake(async () => shared.next());
      const done = new Promise<void>((resolve) =>
        shared.subscribe(() => resolve()),
      );

      await card.internalBeanAction(BEAN_ACTION.SHARE_IMAGE);
      await done;

      expect(alert.showLoadingSpinner).toHaveBeenCalled();
    });
  });
});
