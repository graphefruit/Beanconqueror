import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import en from '../../../../assets/i18n/en.json';
import { Bean } from '../../../../classes/bean/bean';
import { Brew } from '../../../../classes/brew/brew';
import { Settings } from '../../../../classes/settings/settings';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UIHelper } from '../../../../services/uiHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import { UIToast } from '../../../../services/uiToast';
import { BeanCommands } from '../../../../stores/beans/bean-commands';
import { BeanArchivePopoverComponent } from '../bean-archive-popover.component';

describe('BeanArchivePopoverComponent', () => {
  let steps: string[];
  let archive: jasmine.Spy;

  beforeEach(() => {
    steps = [];
    archive = jasmine.createSpy('archive').and.callFake(() => {
      steps.push('archive');
      return Promise.resolve(true);
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: BeanCommands, useValue: { archive } },
        {
          provide: UIToast,
          useValue: {
            showInfoToast: (key: string) => steps.push(`toast ${key}`),
          },
        },
        {
          provide: ModalController,
          useValue: { dismiss: () => steps.push('dismiss') },
        },
        {
          provide: UISettingsStorage,
          useValue: { getSettings: () => new Settings() },
        },
        {
          provide: UIHelper,
          useValue: {
            toFixedIfNecessary: (value: number, digits: number) =>
              UIHelper.prototype.toFixedIfNecessary(value, digits),
          },
        },
      ],
    });
  });

  it('archives the bean with the rating and note given, then confirms and closes', async () => {
    const popover = TestBed.runInInjectionContext(
      () => new BeanArchivePopoverComponent(),
    );
    const bean = new Bean();
    bean.config.uuid = 'alpha';
    popover.data.initializeByObject(bean);
    popover.data.rating = 3;
    popover.data.note = 'last cup';

    await popover.archive();

    expect(archive).toHaveBeenCalledOnceWith('alpha', 3, 'last cup');
    expect(steps).toEqual([
      'archive',
      'toast TOAST_BEAN_ARCHIVED_SUCCESSFULLY',
      'dismiss',
    ]);
  });

  it('offers the average of the rated brews as the rating of an unrated bean', async () => {
    TestBed.configureTestingModule({
      imports: [BeanArchivePopoverComponent, TranslateModule.forRoot()],
      providers: [provideZonelessChangeDetection()],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en);
    translate.use('en');
    // Rated 4 and 2; an unrated brew does not count.
    const brews = [4, 2, 0].map((rating) =>
      Object.assign(new Brew(), { rating }),
    );
    spyOn(UIBeanHelper, 'getInstance').and.returnValue({
      getAllBrewsForThisBean: () => brews,
    } as unknown as UIBeanHelper);
    const bean = new Bean();
    bean.name = 'Alpha Filter';

    const fixture = TestBed.createComponent(BeanArchivePopoverComponent);
    fixture.componentInstance.bean = bean;
    fixture.componentInstance.ionViewWillEnter();
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    // Ionic hides the text of a label from textContent.
    const readable = (node: Element | null) =>
      (node?.innerHTML ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    for (let frame = 0; frame < 3; frame++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    expect(
      [...element.querySelectorAll('ion-item > ion-label')].map(readable),
    ).toEqual([
      'Name: Alpha Filter',
      'Average Brew Rating 3',
      'Rating 3',
      'Notes',
    ]);
    expect(
      element
        .querySelector('ion-range')
        .shadowRoot?.querySelector('[role="slider"]')
        ?.getAttribute('aria-label'),
    ).toBe('Rating');
    expect(
      element
        .querySelector('ngx-stars [role="img"]')
        .getAttribute('aria-label'),
    ).toBe('Rating: 3 of 5 stars');
    // Ionic hands the name on to its textarea.
    expect(
      element
        .querySelector('ion-textarea textarea')
        ?.getAttribute('aria-labelledby'),
    ).toBe('note');
    expect(readable(element.querySelector('#note'))).toBe('Notes');
    expect([...element.querySelectorAll('ion-button')].map(readable)).toEqual([
      'Cancel',
      'Archive',
    ]);
  });
});
