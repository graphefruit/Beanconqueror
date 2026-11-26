import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import {
  TranslateModule,
  TranslatePipe,
  TranslateService,
} from '@ngx-translate/core';

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
        ESPRESSO: 'Espresso',
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
      /^Image of the brew: Yirgacheffe \(Tonino\)\. 15\.01\.2027 09:20\..*Grinder: Comandante\..*BeanConqueror$/,
    );
    expect(
      picture(host).querySelector<HTMLElement>('.share-icon').style.cssText,
    ).toContain('beanconqueror-preparation-v60.svg');
  });

  it('starts in caramel, or in espresso when the app is dark, and changes with the choice', async () => {
    let host = await show();
    const radios = host.querySelectorAll<HTMLInputElement>(
      'fieldset input[type="radio"]',
    );
    expect(radios.length).toBe(4);
    expect(radios[0].checked).toBeTrue();
    expect(picture(host).style.getPropertyValue('--share-frame')).toBe(
      '#825634',
    );

    radios[2].click();
    fixture.detectChanges();
    expect(picture(host).style.getPropertyValue('--share-frame')).toBe(
      '#211914',
    );

    theme.isDarkMode.and.returnValue(true);
    host = await show();
    expect(
      host.querySelectorAll<HTMLInputElement>('fieldset input')[2].checked,
    ).toBeTrue();
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

    expect(graphHelper.brewGraphImage).toHaveBeenCalledWith(brew, 300, 150);
    expect(picture(host).querySelector('img').getAttribute('src')).toBe(GRAPH);
    expect(picture(host).querySelector('img').getAttribute('alt')).toBe('');
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
    expect(picture(host).querySelector('img')).toBeNull();
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
