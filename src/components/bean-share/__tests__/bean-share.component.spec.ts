import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import {
  TranslateModule,
  TranslatePipe,
  TranslateService,
} from '@ngx-translate/core';

import { contrast, firstColour } from '../../../../e2e/support/colour';
import { Bean } from '../../../classes/bean/bean';
import { Settings } from '../../../classes/settings/settings';
import { IBean } from '../../../interfaces/bean/iBean';
import { ShareService } from '../../../services/shareService/share-service.service';
import { ThemeService } from '../../../services/theme/theme.service';
import { UIAlert } from '../../../services/uiAlert';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { BeanUsage } from '../../../stores/beans/bean-usage.store';
import { SHARE_IMAGE_WIDTH } from '../../brew-share/brew-share.component';
import { BeanShareComponent } from '../bean-share.component';

type Spies<K extends string> = Record<K, jasmine.Spy>;

const USAGE: BeanUsage = { brews: 4, grams: 72, lastBrewAt: undefined };

describe('BeanShareComponent', () => {
  let fixture: ComponentFixture<BeanShareComponent>;
  let settings: Settings;
  let shareService: Spies<'shareElementAsImage'>;
  let uiAlert: Spies<'showMessage'>;
  let modalController: Spies<'create' | 'dismiss'>;
  let theme: Spies<'isDarkMode'>;

  beforeEach(() => {
    settings = new Settings();
    settings.date_format = 'DD.MM.YYYY';
    shareService = jasmine.createSpyObj('ShareService', [
      'shareElementAsImage',
    ]);
    shareService.shareElementAsImage.and.resolveTo(true);
    uiAlert = jasmine.createSpyObj('UIAlert', ['showMessage']);
    modalController = jasmine.createSpyObj('ModalController', [
      'create',
      'dismiss',
    ]);
    theme = jasmine.createSpyObj('ThemeService', { isDarkMode: false });

    TestBed.overrideComponent(BeanShareComponent, {
      set: { imports: [TranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
    });
    TestBed.configureTestingModule({
      imports: [BeanShareComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: UISettingsStorage,
          useValue: jasmine.createSpyObj('UISettingsStorage', {
            getSettings: settings,
          }),
        },
        { provide: ShareService, useValue: shareService },
        { provide: UIAlert, useValue: uiAlert },
        { provide: ModalController, useValue: modalController },
        { provide: ThemeService, useValue: theme },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      NOTES: 'Notes',
      BEAN_DATA_ROASTING_DATE: 'Roasting date',
      PAGE_HOME_TOTAL_BREWS: 'Brews',
      BEAN_DATA_FROZEN_ID: 'Frozen id',
      POPOVER_BREWS_OPTION_TOGGLE_FAVOURITE: 'Favourite',
      FROZEN_BEANS: 'Frozen',
      BEAN_DATA_COST: 'Cost',
      SHARE_CARD: { BEAN_DESCRIPTION: 'Image of the bean: {{content}}' },
    });
    translate.use('en');
  });

  function makeBean(fields: Partial<IBean> = {}): IBean {
    const bean = new Bean();
    Object.assign(bean, {
      name: 'Yirgacheffe',
      roaster: 'Tonino',
      roastingDate: '2027-01-05T10:00:00.000Z',
      cost: 17.9,
      weight: 250,
      ...fields,
    });
    return JSON.parse(JSON.stringify(bean)) as IBean;
  }

  async function show(bean = makeBean()): Promise<HTMLElement> {
    fixture = TestBed.createComponent(BeanShareComponent);
    fixture.componentRef.setInput('bean', bean);
    fixture.componentRef.setInput('usage', USAGE);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  /** The protected members the dialog's buttons use. */
  const inside = () =>
    fixture.componentInstance as unknown as {
      share(): Promise<void>;
      dismiss(): Promise<void>;
      busy(): boolean;
    };

  const picture = (host: HTMLElement) =>
    host.querySelector<HTMLElement>('[role="img"]');

  it('shows the bean card as a picture named after its content, without its price', async () => {
    const host = await show();

    const text = picture(host).textContent;
    expect(text).toContain('Yirgacheffe');
    expect(text).toContain('Tonino');
    expect(text).toContain('05.01.2027');
    expect(text).toContain('Roasting date');
    expect(text).toContain('BeanConqueror');
    expect(text).not.toContain('17.9');
    expect(text).not.toContain('Cost');
    expect(picture(host).getAttribute('aria-label')).toMatch(
      /^Image of the bean: Yirgacheffe, Tonino\. Roasting date: 05\.01\.2027\. Brews: 4\..*BeanConqueror$/,
    );
  });

  it('draws the marks of the bean card inline and names them', async () => {
    const host = await show(
      makeBean({
        favourite: true,
        frozenDate: '2027-01-10T10:00:00.000Z',
        frozenId: 'F-7',
      }),
    );

    expect(picture(host).querySelectorAll('svg.share-mark').length).toBe(2);
    expect(picture(host).querySelector('ion-icon')).toBeNull();
    expect(picture(host).querySelector('.share-frozen-id').textContent).toBe(
      'F-7',
    );
    expect(picture(host).getAttribute('aria-label')).toMatch(
      /^Image of the bean: Frozen\. Favourite\. Yirgacheffe, Tonino\. Frozen id: F-7\./,
    );
  });

  it('shows the stars of the roast and the rating, or a custom rating as a number', async () => {
    settings.bean_visible_list_view_parameters.roast_range = true;
    let host = await show(makeBean({ roast_range: 2, rating: 4 }));
    const ratings = picture(host).querySelectorAll('.share-rating');
    expect(ratings.length).toBe(2);
    expect(ratings[0].querySelectorAll('.share-star-empty').length).toBe(3);
    expect(ratings[1].querySelectorAll('.share-star-empty').length).toBe(1);

    settings.bean_rating = 10;
    host = await show(makeBean({ rating: 7.5 }));
    expect(picture(host).querySelector('.share-rating').textContent).toContain(
      '7.5',
    );
  });

  it('keeps every text at 4.5:1 in each colour set and changes with the choice', async () => {
    const host = await show(makeBean({ rating: 4 }));
    const radios = host.querySelectorAll<HTMLInputElement>(
      'fieldset input[type="radio"]',
    );
    expect(radios.length).toBe(4);
    expect(radios[1].checked).toBeTrue();

    for (const radio of Array.from(radios)) {
      radio.click();
      fixture.detectChanges();
      const colour = (selector: string, property = 'color') =>
        firstColour(
          getComputedStyle(
            picture(host).querySelector(selector) ?? picture(host),
          ).getPropertyValue(property),
        );
      const card = colour('.share-card', 'background-color');
      for (const selector of [
        '.share-value',
        '.share-label',
        '.share-roaster',
        '.share-bean',
        '.share-rating',
      ]) {
        expect(contrast(colour(selector), card))
          .withContext(`${selector}, ${radio.value}`)
          .toBeGreaterThanOrEqual(4.5);
      }
      expect(
        contrast(colour('.share-stamp'), colour(':scope', 'background-color')),
      )
        .withContext(`stamp, ${radio.value}`)
        .toBeGreaterThanOrEqual(4.5);
    }
    expect(picture(host).style.getPropertyValue('--share-frame')).toBe(
      '#2f5e4c',
    );
  });

  it('starts in the dark colours of the app when the app is dark', async () => {
    theme.isDarkMode.and.returnValue(true);

    const host = await show();

    expect(
      host.querySelectorAll<HTMLInputElement>('fieldset input')[2].checked,
    ).toBeTrue();
  });

  it('offers the notes only when there are some and starts as the bean card shows them', async () => {
    expect((await show()).querySelector('ion-toggle')).toBeNull();

    const bean = makeBean({ note: 'Sweet and clean' });
    let host = await show(bean);
    expect(host.querySelector('ion-toggle')).not.toBeNull();
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

    settings.bean_visible_list_view_parameters.note = false;
    host = await show(bean);
    expect(picture(host).textContent).not.toContain('Sweet and clean');
  });

  it('shares the picture 1080 pixels wide', async () => {
    const host = await show();

    await inside().share();

    expect(shareService.shareElementAsImage).toHaveBeenCalledOnceWith(
      picture(host),
      SHARE_IMAGE_WIDTH,
    );
    expect(uiAlert.showMessage).not.toHaveBeenCalled();
  });

  it('tells the user when the picture could not be shared, and unlocks again', async () => {
    shareService.shareElementAsImage.and.resolveTo(false);
    await show();
    const component = inside();

    await component.share();

    expect(uiAlert.showMessage).toHaveBeenCalledOnceWith(
      'SHARE_CARD.FAILED',
      undefined,
      undefined,
      true,
    );
    expect(component.busy()).toBeFalse();
  });

  it('shares once while a picture is being drawn', async () => {
    let finish: (shared: boolean) => void;
    shareService.shareElementAsImage.and.returnValue(
      new Promise((resolve) => (finish = resolve)),
    );
    await show();
    const component = inside();

    const first = component.share();
    expect(component.busy()).toBeTrue();
    await component.share();
    finish(true);
    await first;

    expect(shareService.shareElementAsImage).toHaveBeenCalledTimes(1);
    expect(component.busy()).toBeFalse();
  });

  it('closes itself', async () => {
    await show();

    await inside().dismiss();

    expect(modalController.dismiss).toHaveBeenCalledOnceWith(
      undefined,
      'cancel',
      'bean-share',
    );
  });

  it('opens as a dialog for the bean and waits until it is closed', async () => {
    const modal = jasmine.createSpyObj('HTMLIonModalElement', [
      'present',
      'onWillDismiss',
    ]);
    modal.onWillDismiss.and.resolveTo({});
    modalController.create.and.resolveTo(modal);
    const bean = makeBean();

    await BeanShareComponent.open(
      modalController as unknown as ModalController,
      bean,
      USAGE,
    );

    expect(modalController.create).toHaveBeenCalledOnceWith({
      component: BeanShareComponent,
      componentProps: { bean, usage: USAGE },
      id: 'bean-share',
    });
    expect(modal.present).toHaveBeenCalled();
    expect(modal.onWillDismiss).toHaveBeenCalled();
  });
});
