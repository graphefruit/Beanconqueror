import {
  provideZonelessChangeDetection,
  signal,
  WritableSignal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import en from '../../../../assets/i18n/en.json';
import { Bean } from '../../../../classes/bean/bean';
import { Brew } from '../../../../classes/brew/brew';
import { Settings } from '../../../../classes/settings/settings';
import { ISettings } from '../../../../interfaces/settings/iSettings';
import { UIBrewStorage } from '../../../../services/uiBrewStorage';
import { UIToast } from '../../../../services/uiToast';
import { BeanCommands } from '../../../../stores/beans/bean-commands';
import { SettingsStore } from '../../../../stores/settings/settings.store';
import { BeanArchivePopoverComponent } from '../bean-archive-popover.component';

/** A brew as it is stored. */
function storedBrew(bean: string, rating: number): object {
  return JSON.parse(
    JSON.stringify(Object.assign(new Brew(), { bean, rating })),
  ) as object;
}

describe('BeanArchivePopoverComponent', () => {
  let steps: string[];
  let archive: jasmine.Spy;
  let brews: object[];
  let settings: WritableSignal<ISettings>;
  let fixture: ComponentFixture<BeanArchivePopoverComponent>;

  beforeEach(() => {
    steps = [];
    settings = signal<ISettings>(new Settings());
    // Rated 4 and 2; an unrated brew and one of another bean do not count.
    brews = [
      storedBrew('alpha', 4),
      storedBrew('alpha', 2),
      storedBrew('alpha', 0),
      storedBrew('beta', 1),
    ];
    archive = jasmine.createSpy('archive').and.callFake(() => {
      steps.push('archive');
      return Promise.resolve(true);
    });
    TestBed.configureTestingModule({
      imports: [BeanArchivePopoverComponent, TranslateModule.forRoot()],
      providers: [
        provideZonelessChangeDetection(),
        { provide: BeanCommands, useValue: { archive } },
        {
          provide: UIToast,
          useValue: {
            showInfoToast: (key: string) => steps.push(`toast ${key}`),
          },
        },
        {
          provide: ModalController,
          useValue: {
            dismiss: () => {
              steps.push('dismiss');
              return Promise.resolve(true);
            },
          },
        },
        {
          provide: SettingsStore,
          useValue: { settings },
        },
        { provide: UIBrewStorage, useValue: { getRawEntries: () => brews } },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en);
    translate.use('en');
  });

  async function open(fields: Partial<Bean> = {}): Promise<HTMLElement> {
    const bean = Object.assign(new Bean(), { name: 'Alpha Filter' }, fields);
    bean.config.uuid = 'alpha';
    fixture = TestBed.createComponent(BeanArchivePopoverComponent);
    fixture.componentRef.setInput('bean', bean);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    // Ionic renders its labels asynchronously.
    for (let frame = 0; frame < 3; frame++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return fixture.nativeElement as HTMLElement;
  }

  /** Ionic hides the text of a label from textContent. */
  const readable = (node: Element | null) =>
    (node?.innerHTML ?? '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  it('offers the average of the rated brews as the rating of an unrated bean', async () => {
    const element = await open();

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

  it('keeps the rating of a rated bean and shows no average', async () => {
    const element = await open({ rating: 2 });

    expect(
      [...element.querySelectorAll('ion-item > ion-label')].map(readable),
    ).toEqual(['Name: Alpha Filter', 'Rating 2', 'Notes']);
  });

  it('shows no stars on a rating scale other than 5 whole stars', async () => {
    const tenPoints = new Settings();
    tenPoints.bean_rating = 10;
    settings.set(tenPoints);
    const element = await open();

    expect(element.querySelector('ngx-stars')).toBeNull();
    // 4 and 2 of 5 on a scale of 10.
    expect(readable(element.querySelector('ion-badge'))).toBe('6');
  });

  it('archives the bean with the rating and note given, then confirms and closes', async () => {
    await open({ note: 'from the shop' });
    const component = fixture.componentInstance as unknown as {
      rating: { set(value: number): void };
      note: { set(value: string): void };
    };
    component.rating.set(4);
    component.note.set('last cup');

    await fixture.componentInstance.archive();

    expect(archive).toHaveBeenCalledOnceWith('alpha', 4, 'last cup');
    expect(steps).toEqual([
      'archive',
      'toast TOAST_BEAN_ARCHIVED_SUCCESSFULLY',
      'dismiss',
    ]);
  });

  it('archives with the suggested rating and the note of the bean when nothing was changed', async () => {
    await open({ note: 'from the shop' });

    await fixture.componentInstance.archive();

    expect(archive).toHaveBeenCalledOnceWith('alpha', 3, 'from the shop');
  });

  it('closes without archiving on Cancel', async () => {
    const element = await open();

    (
      [...element.querySelectorAll('ion-button')].find(
        (button) => readable(button) === 'Cancel',
      ) as HTMLElement
    ).click();

    expect(archive).not.toHaveBeenCalled();
    expect(steps).toEqual(['dismiss']);
  });
});
