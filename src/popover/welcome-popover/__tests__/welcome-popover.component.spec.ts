import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController, Platform } from '@ionic/angular';

import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { register } from 'swiper/element/bundle';

import de from '../../../assets/i18n/de.json';
import en from '../../../assets/i18n/en.json';
import { Settings } from '../../../classes/settings/settings';
import { ThemeService } from '../../../services/theme/theme.service';
import { UIAnalytics } from '../../../services/uiAnalytics';
import { UIBeanHelper } from '../../../services/uiBeanHelper';
import { UIMillHelper } from '../../../services/uiMillHelper';
import { UIPreparationHelper } from '../../../services/uiPreparationHelper';
import { UISettingsStorage } from '../../../services/uiSettingsStorage';
import { WelcomePopoverComponent } from '../welcome-popover.component';

interface Heading {
  level: number;
  name: string;
}

/** Text as a reader gets it: whitespace collapsed. */
function readable(element: Element | null): string {
  return (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

const TRANSLATIONS = { en, de } as const;

const PROVIDERS = [
  { provide: ModalController, useValue: { dismiss: () => undefined } },
  {
    provide: Platform,
    useValue: {
      backButton: {
        subscribeWithPriority: () => ({ unsubscribe: () => undefined }),
      },
    },
  },
  {
    provide: UISettingsStorage,
    useValue: {
      getSettings: () => new Settings(),
      saveSettings: () => Promise.resolve(),
    },
  },
  {
    provide: UIAnalytics,
    useValue: {
      disableTracking: () => undefined,
      enableTracking: () => undefined,
    },
  },
  {
    provide: ThemeService,
    useValue: { setLightMode: () => undefined },
  },
  { provide: UIBeanHelper, useValue: {} },
  { provide: UIMillHelper, useValue: {} },
  { provide: UIPreparationHelper, useValue: {} },
];

for (const language of ['en', 'de'] as const) {
  describe(`WelcomePopoverComponent (${language})`, () => {
    let fixture: ComponentFixture<WelcomePopoverComponent>;
    let t: (key: string, params?: Record<string, unknown>) => string;

    beforeEach(async () => {
      TestBed.configureTestingModule({
        imports: [WelcomePopoverComponent, TranslateModule.forRoot()],
        providers: PROVIDERS,
      });
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation(language, TRANSLATIONS[language]);
      translate.use(language);
      t = (key, params) => String(translate.instant(key, params));

      fixture = TestBed.createComponent(WelcomePopoverComponent);
      fixture.detectChanges();
      // Swiper is not loaded here; the steps are switched by the component.
      Object.assign(element().querySelector('swiper-container'), {
        swiper: {
          slideNext: () => undefined,
          slideTo: () => undefined,
          pagination: { update: () => undefined },
        },
      });
      await fixture.whenStable();
    });

    function element(): HTMLElement {
      return fixture.nativeElement as HTMLElement;
    }

    function shown(node: Element): boolean {
      return !node.closest('[inert], [aria-hidden="true"]');
    }

    /** The headings screen readers get, in their order. */
    function outline(): Heading[] {
      return Array.from(element().querySelectorAll('[role="heading"], h1, h2'))
        .filter(shown)
        .map((heading) => ({
          level: Number(heading.getAttribute('aria-level')),
          name: readable(heading),
        }));
    }

    /** The names of the steps screen readers get, by their labelling element. */
    function groups(): string[] {
      return Array.from(element().querySelectorAll('[role="group"]'))
        .filter(shown)
        .map((group) =>
          readable(
            document.getElementById(group.getAttribute('aria-labelledby')),
          ),
        );
    }

    async function next(button: string): Promise<void> {
      const step = Array.from(
        element().querySelectorAll<HTMLElement>('ion-button'),
      ).find((each) => shown(each) && readable(each) === t(button));
      step.click();
      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();
    }

    const steps = [
      ['WELCOME_PAGE_TITLE', 'WELCOME_PAGE_ACTIVATE_ANALYTICS_TITLE'],
      ['WELCOME_PAGE_BEAN_HEADLINE', 'WELCOME_PAGE_BEAN_TITLE'],
      ['WELCOME_PAGE_PREPARATION_HEADLINE', 'WELCOME_PAGE_PREPARATION_TITLE'],
      ['WELCOME_PAGE_MILL_HEADLINE', 'WELCOME_PAGE_MILL_TITLE'],
      ['WELCOME_PAGE_LETS_START_HEADLINE', 'WELCOME_PAGE_LETS_START_TITLE'],
    ];

    it('shows one step at a time as a group named by its position, under one level-1 heading', async () => {
      for (const [index, [title, heading]] of steps.entries()) {
        const position = t('A11Y.STEP_OF', { step: index + 1, count: 5 });

        expect(groups())
          .withContext(`step ${index + 1}`)
          .toEqual([position]);
        expect(outline())
          .withContext(`step ${index + 1}`)
          .toEqual([
            { level: 1, name: t(title) },
            { level: 2, name: `${position}, ${t(heading)}` },
          ]);
        if (index > 0) {
          // The focused heading says the position: phones do not say the group.
          expect(readable(document.activeElement))
            .withContext(`focus on step ${index + 1}`)
            .toBe(`${position}, ${t(heading)}`);
        }

        if (index === 0) {
          await next('DO_NOT_ACTIVE');
        } else if (index < steps.length - 1) {
          await next('SKIP');
        }
      }
    });
  });
}

describe('WelcomePopoverComponent with Swiper', () => {
  it('takes a tap on the next step while the slide is still moving in', async () => {
    register();
    TestBed.configureTestingModule({
      imports: [WelcomePopoverComponent, TranslateModule.forRoot()],
      providers: PROVIDERS,
    });
    const fixture = TestBed.createComponent(WelcomePopoverComponent);
    const host = fixture.nativeElement as HTMLElement;
    Object.assign(host.style, { display: 'block', width: '360px' });
    document.body.appendChild(host);
    fixture.detectChanges();
    await fixture.whenStable();

    const slider = host.querySelector('swiper-container') as HTMLElement & {
      swiper: {
        animating: boolean;
      };
    };
    const skip = (step: number) =>
      host
        .querySelectorAll<HTMLElement>('swiper-slide')
        [step - 1].querySelector<HTMLElement>('ion-row:last-child ion-button');
    skip(1).click();
    await fixture.whenStable();
    while (slider.swiper.animating) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    skip(2).click();
    expect(slider.swiper.animating).toBeTrue();

    // A tap whose finger moves a little, or WebKit's own pointer move when the content
    // under a resting pointer moves, between down and up.
    const button = skip(3);
    const pointer = {
      bubbles: true,
      composed: true,
      pointerId: 1,
      isPrimary: true,
    };
    button.dispatchEvent(new PointerEvent('pointerdown', pointer));
    button.dispatchEvent(
      new PointerEvent('pointermove', { ...pointer, clientX: 1 }),
    );
    button.dispatchEvent(new PointerEvent('pointerup', pointer));
    button.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.slide).toBe(4);
    fixture.destroy();
    host.remove();
  });
});

describe('WelcomePopoverComponent after the form of a step', () => {
  it('leads on only once the form has closed', async () => {
    let formClosed: () => void = () => undefined;
    let closing: () => void = () => undefined;
    const closingStarted = new Promise<void>((resolve) => (closing = resolve));
    const form = {
      onDidDismiss: () => {
        closing();
        return new Promise<void>((resolve) => (formClosed = resolve));
      },
    };
    TestBed.configureTestingModule({
      imports: [WelcomePopoverComponent, TranslateModule.forRoot()],
      providers: [
        ...PROVIDERS,
        {
          provide: ModalController,
          useValue: { getTop: () => Promise.resolve(form) },
        },
        {
          provide: UIBeanHelper,
          useValue: { addBean: () => Promise.resolve() },
        },
      ],
    });
    const fixture = TestBed.createComponent(WelcomePopoverComponent);
    fixture.detectChanges();
    Object.assign(fixture.nativeElement.querySelector('swiper-container'), {
      swiper: { slideNext: () => undefined },
    });
    const welcome = fixture.componentInstance;
    const step = welcome.slide;

    // The form is told to close, but its closing animation still runs.
    const added = welcome.addBean();
    await closingStarted;
    expect(welcome.slide).toBe(step);

    formClosed();
    await added;
    expect(welcome.slide).toBe(step + 1);
  });
});
