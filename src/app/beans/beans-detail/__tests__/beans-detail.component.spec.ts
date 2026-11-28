import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';
import { defineCustomElement as defineSegmentButton } from '@ionic/core/components/ion-segment-button.js';
import { defineCustomElement as defineSegment } from '@ionic/core/components/ion-segment.js';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgxStarsComponent } from 'ngx-stars';

import en from '../../../../assets/i18n/en.json';
import { Bean } from '../../../../classes/bean/bean';
import { Settings } from '../../../../classes/settings/settings';
import { IBean } from '../../../../interfaces/bean/iBean';
import { UIAnalytics } from '../../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UIHelper } from '../../../../services/uiHelper';
import { UIRoastingMachineStorage } from '../../../../services/uiRoastingMachineStorage';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { BeanStore } from '../../../../stores/beans/bean.store';
import { DeepReadonly } from '../../../../stores/core/read-only';
import { BeansDetailComponent } from '../beans-detail.component';

const NOW = Date.parse('2026-03-01T08:00:00.000Z');
const DAY = 86_400_000;

/** Ionic renders and marks the selection asynchronously. */
async function until(condition: () => boolean): Promise<void> {
  for (let frame = 0; frame < 120 && !condition(); frame++) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

/** Text as a reader gets it: whitespace collapsed. */
function readable(element: Element): string {
  return (element.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('BeansDetailComponent', () => {
  let settings: Settings;
  const stored = signal(new Map<string, DeepReadonly<IBean>>());

  beforeAll(() => {
    defineSegment();
    defineSegmentButton();
  });

  beforeEach(() => {
    stored.set(new Map());
    settings = new Settings();
    settings.freeze_coffee_beans = true;
    settings.date_format = 'DD.MM.YYYY';

    TestBed.configureTestingModule({
      imports: [BeansDetailComponent, TranslateModule.forRoot()],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: ModalController,
          useValue: jasmine.createSpyObj<ModalController>('ModalController', {
            dismiss: Promise.resolve(true),
          }),
        },
        {
          provide: UIHelper,
          useValue: jasmine.createSpyObj<UIHelper>('UIHelper', [
            'openExternalWebpage',
          ]),
        },
        { provide: UIAnalytics, useValue: { trackEvent: () => undefined } },
        {
          provide: UIBeanHelper,
          useValue: jasmine.createSpyObj<UIBeanHelper>('UIBeanHelper', {
            editBean: Promise.resolve(),
          }),
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => settings },
        },
        {
          provide: UIRoastingMachineStorage,
          useValue: {
            getByUUID: (uuid: string) =>
              uuid === 'machine' ? { name: 'Aillio Bullet' } : undefined,
          },
        },
        { provide: BeanStore, useValue: { byUuid: stored } },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en);
    translate.use('en');
  });

  /** Opens the details of `bean` on the tab `segment`. */
  async function open(
    bean: IBean,
    segment: string,
  ): Promise<ComponentFixture<BeansDetailComponent>> {
    const fixture = TestBed.createComponent(BeansDetailComponent);
    fixture.componentRef.setInput('bean', bean);
    fixture.componentInstance.segment.set(segment);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    // Ionic shows its elements once they are hydrated.
    const element = fixture.nativeElement as HTMLElement;
    await until(() =>
      [...element.querySelectorAll('ion-card, ion-item')].every((item) =>
        item.classList.contains('hydrated'),
      ),
    );
    return fixture;
  }

  it('shows when a frozen bean was frozen and thawed, but not its frozen id', async () => {
    const thawed = new Bean();
    Object.assign(thawed, {
      name: 'Theta Aufgetaut',
      roastingDate: new Date(NOW - 120 * DAY).toISOString(),
      frozenDate: new Date(NOW - 100 * DAY).toISOString(),
      unfrozenDate: new Date(NOW - 5 * DAY).toISOString(),
      frozenId: 'TA1',
    });
    thawed.config.uuid = 'thawed';
    const stored = JSON.parse(JSON.stringify(thawed)) as IBean;

    const fixture = await open(stored, 'frozen');
    const element = fixture.nativeElement as HTMLElement;
    const panel = element.querySelector('[appTabPanel]');
    const tab = element.querySelector('ion-segment-button[value="frozen"]');
    await until(() => panel.getAttribute('aria-labelledby') === tab.id);

    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    expect(readable(tab)).toBe('Frozen information');
    // Each field is a label above its value.
    expect(
      [...panel.querySelectorAll('ion-item')].map((item) =>
        [...item.querySelectorAll('ion-label > *')].map(readable),
      ),
    ).toEqual([
      ['Frozen date:', '21.11.2025'],
      ['Unfrozen date:', '24.02.2026'],
      ['Freezing storage type:', 'Unknown'],
      ['Frozen notes:', ''],
    ]);
    // As laid out, so each field and value is read on its own.
    expect((panel as HTMLElement).innerText.replace(/\s+/g, ' ').trim()).toBe(
      'Frozen date: 21.11.2025 Unfrozen date: 24.02.2026 Freezing storage type: Unknown Frozen notes:',
    );
    // The id of the frozen bag, which the card shows, is missing here.
    expect(element.textContent).not.toContain('TA1');
  });

  /** Gamma Blend of the E2E data set: a blend of three varieties. */
  function blend(): IBean {
    const bean = new Bean();
    Object.assign(bean, {
      name: 'Gamma Blend',
      roaster: 'Rösterei Süd',
      beanMix: 'BLEND',
      weight: 1000,
      cost: 30,
      rating: 5,
      roast: 'CUSTOM_ROAST',
      roast_custom: 'Hausröstung',
      bean_roasting_type: 'FILTER',
      bean_information: [
        ['Ethiopia', 50],
        ['Brazil', 30],
        ['Colombia', 20],
      ].map(([country, percentage]) => ({ country, percentage })),
    });
    bean.config.uuid = 'blend';
    return JSON.parse(JSON.stringify(bean)) as IBean;
  }

  /** The tabs by their names, with the one selected. */
  function tabs(element: HTMLElement): [string, boolean][] {
    return [...element.querySelectorAll('ion-segment-button')].map((tab) => [
      readable(tab),
      tab.classList.contains('segment-button-checked'),
    ]);
  }

  /** The buttons of the header and the footer by their names. */
  function buttons(element: HTMLElement): string[] {
    return [
      ...element.querySelectorAll(
        'ion-header ion-button, ion-footer ion-button',
      ),
    ].map(
      (button) =>
        button.shadowRoot
          ?.querySelector('button')
          ?.getAttribute('aria-label') ??
        button.getAttribute('aria-label') ??
        readable(button),
    );
  }

  // Brews, usage, age and the favourite mark of the card are not shown here.
  // "Roast type" is the kind of roast (filter, espresso), not the roast degree
  // the card shows under the same label.
  it('shows the general information of a bean to read only', async () => {
    settings.bean_manage_parameters.bean_information = true;
    const fixture = await open(blend(), 'general');
    const element = fixture.nativeElement as HTMLElement;
    const panel = element.querySelector<HTMLElement>('[appTabPanel]');
    await until(() => tabs(element).some(([, selected]) => selected));

    const title = element.querySelector('ion-header [role="heading"]');
    expect([readable(title), title.getAttribute('aria-level')]).toEqual([
      'Bean details',
      '1',
    ]);
    expect(buttons(element)).toEqual(['Back', 'Edit bean', 'Cancel']);
    expect(tabs(element)).toEqual([
      ['General', true],
      ['Frozen information', false],
      ['Variety information', false],
    ]);
    expect(panel.innerText.replace(/\s+/g, ' ').trim()).toBe(
      'Name: Gamma Blend Roaster: Rösterei Süd Roast date: Roast type: Filter Rating 5 Blend: Blend More information Weight: 1000 Cost: 30 Flavour profile: Decaffeinated: Website: Archive?: Notes:',
    );
    const heading = panel.querySelector('[role="heading"]');
    expect([readable(heading), heading.getAttribute('aria-level')]).toEqual([
      'More information',
      '2',
    ]);
    const rating = panel.querySelector('ion-range');
    expect(rating.getAttribute('disabled')).toBe('true');
    expect(
      rating.shadowRoot
        ?.querySelector('[role="slider"]')
        ?.getAttribute('aria-label'),
    ).toBe('Rating');
    const stars = fixture.debugElement.query(
      (node) => node.name === 'ngx-stars',
    ).componentInstance as NgxStarsComponent;
    await until(() => stars.rating === 5);
    await fixture.whenStable();
    expect(
      panel.querySelector('ngx-stars [role="img"]').getAttribute('aria-label'),
    ).toBe('Rating: 5 of 5 stars');
    expect(
      [...panel.querySelectorAll('ion-checkbox')].map((checkbox) => [
        readable(checkbox),
        checkbox.getAttribute('disabled'),
      ]),
    ).toEqual([
      ['Decaffeinated:', 'true'],
      ['Archive?:', 'true'],
    ]);
    expect(panel.querySelector('ion-item[button]').textContent).toContain(
      'Website:',
    );
    // Nothing to type in; the checkboxes and the range carry hidden inputs.
    expect(
      element.querySelectorAll(
        'input:not([type="hidden"], [type="checkbox"]), textarea, ion-input, ion-textarea',
      ).length,
    ).toBe(0);
  });

  it('has the frozen tab for a bean that was never frozen', async () => {
    const fixture = await open(blend(), 'frozen');
    const panel = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLElement>('[appTabPanel]');

    expect(panel.innerText.replace(/\s+/g, ' ').trim()).toBe(
      'Frozen date: Unfrozen date: Freezing storage type: Unknown Frozen notes:',
    );
  });

  it('shows each variety of a blend as a section of its own', async () => {
    settings.bean_manage_parameters.bean_information = true;
    const fixture = await open(blend(), 'sortinformation');
    const panel = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLElement>('[appTabPanel]');

    expect(
      [...panel.querySelectorAll('[role="heading"]')].map((heading) => [
        readable(heading),
        heading.getAttribute('aria-level'),
      ]),
    ).toEqual([
      ['1. Bean Type', '2'],
      ['2. Bean Type', '2'],
      ['3. Bean Type', '2'],
    ]);
    expect(
      [...panel.querySelectorAll('.field-label')]
        .map(readable)
        .filter((label) => ['Country:', 'Percentage:'].includes(label)),
    ).toEqual([
      'Country:',
      'Percentage:',
      'Country:',
      'Percentage:',
      'Country:',
      'Percentage:',
    ]);
    const values = panel.innerText;
    for (const shown of ['Ethiopia', '50', 'Brazil', '30', 'Colombia', '20']) {
      expect(values).toContain(shown);
    }
  });
  /** A self-roasted bean: the details show its roast first. */
  function roasted(): IBean {
    const bean = blend();
    Object.assign(bean.bean_roast_information, {
      bean_uuid: 'green',
      roaster_machine: 'machine',
      drop_temperature: 210,
      roast_length: 725,
      first_crack_minute: 480,
      second_crack_minute: 0,
      green_bean_weight: 1200,
    });
    return bean;
  }

  it('shows the roast of a self-roasted bean on a tab of its own', async () => {
    const fixture = await open(roasted(), 'roastinformation');
    const element = fixture.nativeElement as HTMLElement;
    await until(() => tabs(element).some(([, selected]) => selected));

    expect(tabs(element)[0]).toEqual(['Roast information', true]);
    expect(
      [...element.querySelectorAll<HTMLElement>('[appTabPanel] ion-item')]
        .map((item) => item.innerText.replace(/\s+/g, ' ').trim())
        .slice(0, 9),
    ).toEqual([
      'Final temperature of roast: 210',
      'Roast length: 00:12:05',
      'Roasting machine: Aillio Bullet',
      'Green bean weight: 1200',
      'Weight after roasting: 1000',
      'Weight loss: 16.67% (200.0g)',
      'First crack minute: 00:08:00',
      'First crack temperature: 0',
      'Second crack minute: -',
    ]);
  });

  it('shows the stored state of the bean, also after it was saved again', async () => {
    const bean = blend();
    stored.set(new Map([[bean.config.uuid, bean]]));
    const fixture = await open(bean, 'general');
    const element = fixture.nativeElement as HTMLElement;
    const panelText = () =>
      element
        .querySelector<HTMLElement>('[appTabPanel]')
        .innerText.replace(/\s+/g, ' ');
    expect(panelText()).toContain('Name: Gamma Blend');

    const edited: IBean = { ...roasted(), name: 'Gamma Neu', rating: 3 };
    stored.set(new Map([[bean.config.uuid, edited]]));
    await fixture.whenStable();

    const panel = panelText();
    expect(panel).toContain('Name: Gamma Neu');
    expect(panel).toContain('Rating 3');
    expect(tabs(element)[0][0]).toBe('Roast information');
  });

  it('edits a copy of the shown bean', async () => {
    const bean = blend();
    const fixture = await open(bean, 'general');
    const helper = TestBed.inject(UIBeanHelper) as jasmine.SpyObj<UIBeanHelper>;

    await fixture.componentInstance.edit();

    const edited = helper.editBean.calls.mostRecent().args[0];
    expect(edited).toBeInstanceOf(Bean);
    expect(edited).not.toBe(bean as unknown as Bean);
    expect(edited.name).toBe('Gamma Blend');
    expect(edited.bean_information).not.toBe(bean.bean_information);
  });

  it('shows a rating on a custom scale as a number', async () => {
    settings.bean_rating = 10;
    const fixture = await open({ ...blend(), rating: 7.5 }, 'general');
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('ngx-stars.brew-stars')).toBeNull();
    expect(
      readable(element.querySelector('ion-range .ion-text-right ion-badge')),
    ).toBe('7.5');
  });

  it('opens the website of the bean and closes itself', async () => {
    const fixture = await open(
      { ...blend(), url: 'https://example.com' },
      'general',
    );
    const helper = TestBed.inject(UIHelper) as jasmine.SpyObj<UIHelper>;
    const modal = TestBed.inject(
      ModalController,
    ) as jasmine.SpyObj<ModalController>;

    fixture.componentInstance.openURL();
    fixture.componentInstance.dismiss();

    expect(helper.openExternalWebpage.calls.allArgs()).toEqual([
      ['https://example.com'],
    ]);
    expect(modal.dismiss.calls.allArgs()).toEqual([
      [{ dismissed: true }, undefined, 'bean-detail'],
    ]);
  });

  it('opens nothing for a bean without a website', async () => {
    const fixture = await open(blend(), 'general');
    fixture.componentInstance.openURL();
    const helper = TestBed.inject(UIHelper) as jasmine.SpyObj<UIHelper>;
    expect(helper.openExternalWebpage.calls.count()).toBe(0);
  });
});
