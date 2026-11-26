import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import {
  TranslateModule,
  TranslatePipe,
  TranslateService,
} from '@ngx-translate/core';

import { contrast, firstColour, Rgb } from '../../../../e2e/support/colour';
import { Bean } from '../../../classes/bean/bean';
import { Brew, BrewInstanceHelper } from '../../../classes/brew/brew';
import { Mill } from '../../../classes/mill/mill';
import { Preparation } from '../../../classes/preparation/preparation';
import { Settings } from '../../../classes/settings/settings';
import { PREPARATION_TYPES } from '../../../enums/preparations/preparationTypes';
import { GraphHelperService } from '../../../services/graphHelper/graph-helper.service';
import { ShareService } from '../../../services/shareService/share-service.service';
import { ThemeService } from '../../../services/theme/theme.service';
import { UIAlert } from '../../../services/uiAlert';
import { UIBeanStorage } from '../../../services/uiBeanStorage';
import { UILog } from '../../../services/uiLog';
import { UIMillStorage } from '../../../services/uiMillStorage';
import { UIPreparationStorage } from '../../../services/uiPreparationStorage';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { BrewShareComponent, SHARE_IMAGE_WIDTH } from '../brew-share.component';
import { GRAPH_INK } from '../share-palettes';

const GRAPH = 'data:image/png;base64,AAAA';

type Spies<K extends string> = Record<K, jasmine.Spy>;

describe('BrewShareComponent', () => {
  let fixture: ComponentFixture<BrewShareComponent>;
  let settings: Settings;
  let graphHelper: Spies<'brewGraphImage'>;
  let shareService: Spies<'shareElementAsImage'>;
  let uiAlert: Spies<'showMessage'>;
  let uiLog: Spies<'error'>;
  let modalController: Spies<'create' | 'dismiss'>;
  let theme: Spies<'isDarkMode'>;

  beforeEach(() => {
    settings = new Settings();
    settings.date_format = 'DD.MM.YYYY';
    graphHelper = jasmine.createSpyObj('GraphHelperService', [
      'brewGraphImage',
    ]);
    graphHelper.brewGraphImage.and.resolveTo(undefined);
    shareService = jasmine.createSpyObj('ShareService', [
      'shareElementAsImage',
    ]);
    shareService.shareElementAsImage.and.resolveTo(true);
    uiAlert = jasmine.createSpyObj('UIAlert', ['showMessage']);
    uiLog = jasmine.createSpyObj('UILog', ['error']);
    modalController = jasmine.createSpyObj('ModalController', [
      'create',
      'dismiss',
    ]);
    theme = jasmine.createSpyObj('ThemeService', { isDarkMode: false });

    TestBed.overrideComponent(BrewShareComponent, {
      set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
    });
    TestBed.configureTestingModule({
      imports: [BrewShareComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: UISettingsStorage,
          useValue: jasmine.createSpyObj('UISettingsStorage', {
            getSettings: settings,
          }),
        },
        { provide: GraphHelperService, useValue: graphHelper },
        { provide: ShareService, useValue: shareService },
        { provide: UIAlert, useValue: uiAlert },
        { provide: UILog, useValue: uiLog },
        { provide: ModalController, useValue: modalController },
        { provide: ThemeService, useValue: theme },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      BREW_DATA_NOTES: 'Notes',
      BREW_DATA_MILL: 'Grinder',
      SHARE_CARD: {
        DESCRIPTION: 'Image of the brew: {{content}}',
        CARAMEL: 'Caramel',
        APP_LIGHT: 'App light',
        APP_DARK: 'App dark',
        GRAPH_FAILED: 'The graph could not be added to the image.',
      },
    });
    translate.use('en');
    BrewInstanceHelper.setEntryAmountBackToZero();
  });

  afterEach(() => {
    (UIBeanStorage as any).instance = undefined;
    (UIPreparationStorage as any).instance = undefined;
    (UIMillStorage as any).instance = undefined;
  });

  function makeBrew(): Brew {
    const bean = new Bean();
    bean.config.uuid = 'bean-1';
    bean.name = 'Yirgacheffe';
    bean.roaster = 'Tonino';
    bean.cost = 17.9;
    const preparation = new Preparation();
    preparation.config.uuid = 'preparation-1';
    preparation.name = 'V60';
    preparation.type = PREPARATION_TYPES.V60;
    const mill = new Mill();
    mill.config.uuid = 'mill-1';
    mill.name = 'Comandante';
    (UIBeanStorage as any).instance = { getByUUID: () => bean };
    (UIPreparationStorage as any).instance = { getByUUID: () => preparation };
    (UIMillStorage as any).instance = { getByUUID: () => mill };

    const brew = new Brew();
    brew.config.unix_timestamp = new Date(2027, 0, 15, 9, 20).getTime() / 1000;
    brew.bean = bean.config.uuid;
    brew.method_of_preparation = preparation.config.uuid;
    brew.mill = mill.config.uuid;
    brew.grind_weight = 18;
    brew.brew_quantity = 300;
    return brew;
  }

  async function show(brew = makeBrew()): Promise<HTMLElement> {
    fixture = TestBed.createComponent(BrewShareComponent);
    fixture.componentRef.setInput('brew', brew);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const picture = (host: HTMLElement) =>
    host.querySelector<HTMLElement>('[role="img"]');

  it('shows the brew card as a picture named after its content', async () => {
    const host = await show();

    expect(picture(host).textContent).toContain('15.01.2027');
    expect(picture(host).textContent).toContain('Yirgacheffe');
    expect(picture(host).textContent).toContain('Comandante');
    expect(picture(host).textContent).toContain('BeanConqueror');
    expect(picture(host).textContent).not.toContain('17.9');
    expect(picture(host).getAttribute('aria-label')).toMatch(
      /^Image of the brew: 15\.01\.2027 09:20\. Yirgacheffe \(Tonino\)\..*Grinder: Comandante\..*BeanConqueror$/,
    );
    // The icon as it is, not a silhouette: some are photos of the device.
    const icon =
      picture(host).querySelector<HTMLImageElement>('img.share-icon');
    expect(icon.getAttribute('src')).toBe(
      'assets/custom-ion-icons/beanconqueror-preparation-v60.svg',
    );
    expect(icon.getAttribute('alt')).toBe('');
    const look = getComputedStyle(icon);
    expect([look.filter, look.maskImage, look.mixBlendMode]).toEqual([
      'none',
      'none',
      'normal',
    ]);
  });

  it('starts in the colours of the app, light or dark as it is, and changes with the choice', async () => {
    let host = await show();
    const radios = host.querySelectorAll<HTMLInputElement>(
      'fieldset input[type="radio"]',
    );
    expect(radios.length).toBe(4);
    expect(radios[1].checked).toBeTrue();
    expect(getComputedStyle(picture(host)).backgroundColor).toBe(
      'rgb(234, 217, 196)',
    );

    radios[0].click();
    fixture.detectChanges();
    expect(picture(host).style.getPropertyValue('--share-frame')).toBe(
      '#825634',
    );

    theme.isDarkMode.and.returnValue(true);
    host = await show();
    expect(
      host.querySelectorAll<HTMLInputElement>('fieldset input')[2].checked,
    ).toBeTrue();
  });

  it("draws the app's light and dark colours whatever mode the app shows, every text at 4.5:1", async () => {
    // As the brew card in either mode: page, card, text, secondary text.
    const APP: Record<string, Rgb[]> = {
      light: [
        [234, 217, 196],
        [255, 255, 255],
        [33, 25, 20],
        [74, 56, 44],
      ],
      dark: [
        [33, 25, 20],
        [42, 33, 26],
        [255, 255, 255],
        [225, 209, 191],
      ],
    };
    const brew = makeBrew();
    brew.rating = 4;
    for (const appIsDark of [false, true]) {
      theme.isDarkMode.and.returnValue(appIsDark);
      const host = await show(brew);
      const radios = host.querySelectorAll<HTMLInputElement>(
        'fieldset input[type="radio"]',
      );
      for (const [index, id] of [
        'caramel',
        'light',
        'dark',
        'sage',
      ].entries()) {
        radios[index].click();
        fixture.detectChanges();
        const colour = (selector: string, property = 'color') =>
          firstColour(
            getComputedStyle(
              picture(host).querySelector(selector) ?? picture(host),
            ).getPropertyValue(property),
          );
        const frame = colour(':scope', 'background-color');
        const card = colour('.share-card', 'background-color');
        const text = colour(':scope');
        const muted = colour('.share-roaster');
        const context = `${id} in an app that is ${appIsDark ? 'dark' : 'light'}`;
        for (const [name, ink] of Object.entries({
          text,
          muted,
          accent: colour('.share-bean'),
          stars: colour('.share-rating'),
        })) {
          expect(contrast(ink, card))
            .withContext(`${name}, ${context}`)
            .toBeGreaterThanOrEqual(4.5);
        }
        expect(contrast(colour('.share-stamp'), frame))
          .withContext(`stamp, ${context}`)
          .toBeGreaterThanOrEqual(4.5);
        if (APP[id]) {
          expect([frame, card, text, muted])
            .withContext(context)
            .toEqual(APP[id]);
          const ink = Number.parseInt(
            GRAPH_INK[id === 'dark' ? 'dark' : 'light'].slice(1),
            16,
          );
          expect([(ink >> 16) & 255, (ink >> 8) & 255, ink & 255])
            .withContext('graph axes as the secondary text')
            .toEqual(muted);
        }
        const swatch = host.querySelectorAll('.share-swatch')[index];
        expect(firstColour(getComputedStyle(swatch).backgroundColor))
          .withContext(`swatch, ${context}`)
          .toEqual(frame);
      }
    }
  });

  it('offers the note only when there is one and shows it as the brew card does', async () => {
    expect((await show()).querySelector('ion-toggle')).toBeNull();

    const brew = makeBrew();
    brew.note = 'Sweet and clean';
    let host = await show(brew);
    expect(host.querySelector('ion-toggle')).not.toBeNull();
    expect(picture(host).textContent).not.toContain('Sweet and clean');

    settings.visible_list_view_parameters.note = true;
    host = await show(brew);
    expect(picture(host).textContent).toContain('Sweet and clean');
    expect(picture(host).getAttribute('aria-label')).toContain(
      'Notes: Sweet and clean',
    );

    host
      .querySelector('ion-toggle')
      .dispatchEvent(
        new CustomEvent('ionChange', { detail: { checked: false } }),
      );
    fixture.detectChanges();
    expect(picture(host).textContent).not.toContain('Sweet and clean');
    expect(picture(host).getAttribute('aria-label')).not.toContain('Notes');
  });

  it('puts the graph below the card when the brew has one', async () => {
    graphHelper.brewGraphImage.and.resolveTo(GRAPH);
    const brew = makeBrew();
    brew.flow_profile = 'brews/1_flow_profile.json';

    const host = await show(brew);

    expect(graphHelper.brewGraphImage).toHaveBeenCalledOnceWith(
      brew,
      300,
      150,
      { dark: false, ink: '#4a382c' },
    );
    expect(
      picture(host).querySelector('img.share-graph').getAttribute('src'),
    ).toBe(GRAPH);
    expect(
      picture(host).querySelector('img.share-graph').getAttribute('alt'),
    ).toBe('');
  });

  it('draws the graph again only when a colour needs the other mode, sharing nothing meanwhile', async () => {
    const DARK = 'data:image/png;base64,DARK';
    const pending: Array<(image: string) => void> = [];
    graphHelper.brewGraphImage.and.callFake(
      () => new Promise((resolve) => pending.push(resolve)),
    );
    const brew = makeBrew();
    brew.flow_profile = 'brews/1_flow_profile.json';
    fixture = TestBed.createComponent(BrewShareComponent);
    fixture.componentRef.setInput('brew', brew);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const radios = host.querySelectorAll<HTMLInputElement>(
      'fieldset input[type="radio"]',
    );
    // Ionic moves aria-busy into the button once drawn, so the state is read.
    const busy = () => String((fixture.componentInstance as any).busy());
    pending.shift()(GRAPH);
    await fixture.whenStable();
    expect(busy()).toBe('false');

    radios[0].click(); // caramel: light as well
    expect(graphHelper.brewGraphImage).toHaveBeenCalledTimes(1);
    expect(busy()).toBe('false');

    radios[2].click(); // espresso: dark
    expect(graphHelper.brewGraphImage).toHaveBeenCalledWith(brew, 300, 150, {
      dark: true,
      ink: '#e1d1bf',
    });
    expect(busy()).toBe('true');
    await (fixture.componentInstance as any).share();
    expect(shareService.shareElementAsImage).not.toHaveBeenCalled();

    // Back to light before the dark graph is in: the late dark one is dropped.
    radios[0].click();
    pending.shift()(DARK);
    await fixture.whenStable();
    expect(busy()).toBe('true');
    pending.shift()(GRAPH);
    await fixture.whenStable();
    expect(busy()).toBe('false');
    expect(
      picture(host).querySelector('img.share-graph').getAttribute('src'),
    ).toBe(GRAPH);
    expect(graphHelper.brewGraphImage).toHaveBeenCalledTimes(3);
  });

  it('keeps sharing locked while either the share or a new graph still runs', async () => {
    const pending: Array<(image: string) => void> = [];
    graphHelper.brewGraphImage.and.callFake(
      () => new Promise((resolve) => pending.push(resolve)),
    );
    let shared: (done: boolean) => void;
    shareService.shareElementAsImage.and.returnValue(
      new Promise((resolve) => (shared = resolve)),
    );
    const brew = makeBrew();
    brew.flow_profile = 'brews/1_flow_profile.json';
    fixture = TestBed.createComponent(BrewShareComponent);
    fixture.componentRef.setInput('brew', brew);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;
    const radios = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLInputElement>('fieldset input[type="radio"]');
    pending.shift()(GRAPH);
    await fixture.whenStable();

    const sharing = component.share();
    radios[2].click(); // espresso: dark, drawn while the share runs
    pending.shift()('data:image/png;base64,DARK');
    await fixture.whenStable();
    expect(component.busy()).withContext('share still runs').toBe(true);

    radios[0].click(); // caramel: light again, drawn after the share ends
    shared(true);
    await sharing;
    expect(component.busy()).withContext('graph still drawn').toBe(true);
    pending.shift()(GRAPH);
    await fixture.whenStable();
    expect(component.busy()).toBe(false);
  });

  it('shows the marks of the brew card and names them', async () => {
    const brew = makeBrew();
    brew.best_brew = true;
    brew.favourite = true;
    brew.customInformation.imported = {
      source: 'gaggiuino',
      sourceName: 'Gaggiuino',
      device: 'Gaggia Classic',
      schema: 1,
    };
    brew.getBean().frozenDate = '2027-01-01';
    TestBed.inject(TranslateService).setTranslation(
      'en',
      {
        POPOVER_BEST_BREW: 'Best brew',
        POPOVER_BREWS_OPTION_TOGGLE_FAVOURITE: 'Favourite',
        FROZEN_BEANS: 'Frozen',
        BREW_IMPORTED_FROM: 'Imported from',
      },
      true,
    );

    const host = await show(brew);

    expect(picture(host).querySelectorAll('svg.share-mark').length).toBe(3);
    expect(picture(host).textContent).toContain(
      'Imported from Gaggiuino · Gaggia Classic',
    );
    expect(picture(host).getAttribute('aria-label')).toMatch(
      /^Image of the brew: Best brew\. Favourite\. 15\.01\.2027 09:20\. Frozen\. Yirgacheffe \(Tonino\)\. Imported from Gaggiuino · Gaggia Classic\./,
    );
  });

  it('shares only once the graph is in', async () => {
    let drawn: (image: string) => void;
    graphHelper.brewGraphImage.and.returnValue(
      new Promise((resolve) => (drawn = resolve)),
    );
    const brew = makeBrew();
    brew.flow_profile = 'brews/1_flow_profile.json';
    fixture = TestBed.createComponent(BrewShareComponent);
    fixture.componentRef.setInput('brew', brew);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance as any;

    expect(host.querySelector('ion-button').getAttribute('aria-busy')).toBe(
      'true',
    );
    await component.share();
    expect(shareService.shareElementAsImage).not.toHaveBeenCalled();

    drawn(GRAPH);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(host.querySelector('ion-button').getAttribute('aria-busy')).toBe(
      'false',
    );
    await component.share();
    expect(shareService.shareElementAsImage).toHaveBeenCalledTimes(1);
  });

  it('tells and logs when the graph cannot be drawn and keeps the card', async () => {
    const error = new Error('no file');
    graphHelper.brewGraphImage.and.rejectWith(error);

    const host = await show();

    expect(uiLog.error).toHaveBeenCalledWith(
      'Share - could not draw the graph',
      error,
    );
    expect(host.querySelector('[role="status"]').textContent).toContain(
      'The graph could not be added to the image.',
    );
    expect(picture(host).querySelector('img.share-graph')).toBeNull();
  });

  it('shares the picture 1080 pixels wide', async () => {
    const host = await show();

    await (fixture.componentInstance as any).share();

    expect(shareService.shareElementAsImage).toHaveBeenCalledOnceWith(
      picture(host),
      SHARE_IMAGE_WIDTH,
    );
    expect(uiAlert.showMessage).not.toHaveBeenCalled();
  });

  it('tells the user when the picture could not be shared', async () => {
    shareService.shareElementAsImage.and.resolveTo(false);
    await show();

    await (fixture.componentInstance as any).share();

    expect(uiAlert.showMessage).toHaveBeenCalledOnceWith(
      'SHARE_CARD.FAILED',
      undefined,
      undefined,
      true,
    );
  });

  it('shares once while a picture is being drawn', async () => {
    let finish: (shared: boolean) => void;
    shareService.shareElementAsImage.and.returnValue(
      new Promise((resolve) => (finish = resolve)),
    );
    await show();
    const component = fixture.componentInstance as any;

    const first = component.share();
    await component.share();
    finish(true);
    await first;

    expect(shareService.shareElementAsImage).toHaveBeenCalledTimes(1);
  });

  it('closes itself', async () => {
    await show();

    await (fixture.componentInstance as any).dismiss();

    expect(modalController.dismiss).toHaveBeenCalledOnceWith(
      undefined,
      'cancel',
      'brew-share',
    );
  });

  it('opens as a dialog for the brew and waits until it is closed', async () => {
    const modal = jasmine.createSpyObj('HTMLIonModalElement', [
      'present',
      'onWillDismiss',
    ]);
    modal.onWillDismiss.and.resolveTo({});
    modalController.create.and.resolveTo(modal);
    const brew = makeBrew();

    await BrewShareComponent.open(
      modalController as unknown as ModalController,
      brew,
    );

    expect(modalController.create).toHaveBeenCalledOnceWith(
      jasmine.objectContaining({
        component: BrewShareComponent,
        componentProps: { brew },
      }),
    );
    expect(modal.present).toHaveBeenCalled();
    expect(modal.onWillDismiss).toHaveBeenCalled();
  });
});
