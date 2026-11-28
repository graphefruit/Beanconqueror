import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalController } from '@ionic/angular';

import { TranslateModule } from '@ngx-translate/core';

import { Settings } from '../../../../classes/settings/settings';
import { BEAN_SORT_AFTER } from '../../../../enums/beans/beanSortAfter';
import { BEAN_SORT_ORDER } from '../../../../enums/beans/beanSortOrder';
import { IBeanPageSort } from '../../../../interfaces/bean/iBeanPageSort';
import { ISettings } from '../../../../interfaces/settings/iSettings';
import { SettingsStore } from '../../../../stores/settings/settings.store';
import { BeanSortComponent } from '../bean-sort.component';

const UNSORTED: IBeanPageSort = {
  sort_order: BEAN_SORT_ORDER.UNKOWN,
  sort_after: BEAN_SORT_AFTER.UNKOWN,
};

describe('BeanSortComponent', () => {
  let settings: ReturnType<typeof signal<ISettings>>;
  let dismiss: jasmine.Spy;
  let fixture: ComponentFixture<BeanSortComponent>;

  beforeEach(() => {
    settings = signal(new Settings());
    dismiss = jasmine.createSpy('dismiss').and.resolveTo(true);
    TestBed.configureTestingModule({
      imports: [BeanSortComponent, TranslateModule.forRoot()],
      providers: [
        provideZonelessChangeDetection(),
        { provide: SettingsStore, useValue: { settings } },
        { provide: ModalController, useValue: { dismiss } },
      ],
    });
  });

  async function open(sort: IBeanPageSort = UNSORTED): Promise<void> {
    fixture = TestBed.createComponent(BeanSortComponent);
    fixture.componentRef.setInput('bean_sort', sort);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  }

  function items(): HTMLElement[] {
    return [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        'ion-item[aria-pressed]',
      ),
    ];
  }

  function item(label: string): HTMLElement {
    return [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        'ion-item',
      ),
    ].find((each) => each.textContent.trim().startsWith(label));
  }

  /** The texts of the chosen items. */
  function chosen(): string[] {
    return items()
      .filter((each) => each.getAttribute('aria-pressed') === 'true')
      .map((each) => each.textContent.trim());
  }

  async function tap(label: string): Promise<void> {
    item(label).click();
    await fixture.whenStable();
  }

  async function openFurtherSorts(): Promise<void> {
    await tap('EXTEND_SORT_AFTER');
  }

  function labels(): string[] {
    return items().map((each) => each.textContent.trim());
  }

  function withDates(buyDate: boolean, openDate: boolean, bestDate: boolean) {
    const next = new Settings();
    Object.assign(next.bean_manage_parameters, { buyDate, openDate, bestDate });
    settings.set(next);
  }

  it('offers the directions and the main criteria as buttons, none chosen', async () => {
    await open();

    expect(labels()).toEqual([
      'ASCENDING',
      'DESCENDING',
      'BEAN_SORT_NAME_OF_BEAN',
      'BEAN_SORT_ROASTER',
      'BEAN_SORT_ROASTING_DATE',
      'BREW_DATA_RATING',
      'BEAN_SORT_BEAN_AGE',
      'BEAN_SORT_RECENTLY_USED',
    ]);
    expect(chosen()).toEqual([]);
    expect(items().every((each) => each.tabIndex === 0)).toBeTrue();
  });

  it('shows the sort it was opened with as chosen, like the outline', async () => {
    await open({
      sort_after: BEAN_SORT_AFTER.ROASTER,
      sort_order: BEAN_SORT_ORDER.DESCENDING,
    });

    expect(chosen()).toEqual(['DESCENDING', 'BEAN_SORT_ROASTER']);
    expect(
      items()
        .filter((each) => each.classList.contains('active'))
        .map((each) => each.textContent.trim()),
    ).toEqual(['DESCENDING', 'BEAN_SORT_ROASTER']);
  });

  it('sorts ascending by a criterion chosen without a direction', async () => {
    await open();

    await tap('BEAN_SORT_NAME_OF_BEAN');

    expect(chosen()).toEqual(['ASCENDING', 'BEAN_SORT_NAME_OF_BEAN']);
  });

  it('sorts by name in a direction chosen without a criterion', async () => {
    await open();

    await tap('DESCENDING');

    expect(chosen()).toEqual(['DESCENDING', 'BEAN_SORT_NAME_OF_BEAN']);
  });

  it('applies the sort chosen and leaves the given one as it was', async () => {
    const given = { ...UNSORTED };
    await open(given);
    await tap('BREW_DATA_RATING');

    fixture.componentInstance.useFilter();

    expect(dismiss).toHaveBeenCalledOnceWith(
      {
        bean_sort: {
          sort_after: BEAN_SORT_AFTER.RATING,
          sort_order: BEAN_SORT_ORDER.ASCENDING,
        },
      },
      undefined,
      BeanSortComponent.COMPONENT_ID,
    );
    expect(given).toEqual(UNSORTED);
  });

  it('resets to no sort', async () => {
    await open({
      sort_after: BEAN_SORT_AFTER.ROASTER,
      sort_order: BEAN_SORT_ORDER.DESCENDING,
    });

    fixture.componentInstance.resetFilter();

    expect(dismiss).toHaveBeenCalledOnceWith(
      { bean_sort: UNSORTED },
      undefined,
      BeanSortComponent.COMPONENT_ID,
    );
  });

  it('changes nothing when closed without its buttons', async () => {
    await open();
    await tap('BEAN_SORT_ROASTER');

    fixture.componentInstance.dismiss();

    expect(dismiss).toHaveBeenCalledOnceWith(
      { bean_sort: undefined },
      undefined,
      BeanSortComponent.COMPONENT_ID,
    );
  });

  it('shows the further criteria on a button that tells whether they are open', async () => {
    await open();
    const further = item('EXTEND_SORT_AFTER');
    expect(further.getAttribute('aria-expanded')).toBe('false');
    expect(further.hasAttribute('aria-pressed')).toBeFalse();

    await openFurtherSorts();

    expect(further.getAttribute('aria-expanded')).toBe('true');
    expect(labels()).toContain('BEAN_SORT_INFORMATION_PROCESSING');
    await tap('BEAN_SORT_WEIGHT_REMAINING');
    expect(chosen()).toEqual(['ASCENDING', 'BEAN_SORT_WEIGHT_REMAINING']);

    await openFurtherSorts();
    expect(further.getAttribute('aria-expanded')).toBe('false');
    expect(labels()).not.toContain('BEAN_SORT_INFORMATION_PROCESSING');
  });

  it('chooses with Enter and Space, once per press', async () => {
    await open();
    const roaster = item('BEAN_SORT_ROASTER');
    const press = (key: string, repeat = false) => {
      const event = new KeyboardEvent('keydown', {
        key,
        repeat,
        cancelable: true,
      });
      roaster.dispatchEvent(event);
      return event;
    };
    const click = jasmine.createSpy('click');
    roaster.addEventListener('click', click);

    const space = press(' ');
    press('Enter');
    press('Enter', true);
    await fixture.whenStable();

    expect(click).toHaveBeenCalledTimes(2);
    expect(space.defaultPrevented).toBeTrue();
    expect(chosen()).toEqual(['ASCENDING', 'BEAN_SORT_ROASTER']);
  });

  it('offers sorting by the dates the bean form asks for', async () => {
    withDates(true, false, true);
    await open();
    await openFurtherSorts();

    expect(labels().slice(8)).toEqual([
      'BEAN_SORT_BEAN_ROASTING_TYPE',
      'BEAN_SORT_WEIGHT',
      'BEAN_DATA_BUY_DATE',
      'BEAN_DATA_BEST_DATE',
      'BEAN_SORT_WEIGHT_REMAINING',
      'BEAN_SORT_AROMATICS',
      'BEAN_SORT_INFORMATION_COUNTRY',
      'BEAN_SORT_INFORMATION_REGION',
      'BEAN_SORT_INFORMATION_VARIETY',
      'BEAN_SORT_INFORMATION_PROCESSING',
    ]);
  });

  it('offers no date the bean form does not ask for', async () => {
    withDates(false, true, false);
    await open();
    await openFurtherSorts();

    const shown = labels();
    expect(shown).not.toContain('BEAN_DATA_BUY_DATE');
    expect(shown).toContain('BEAN_DATA_OPEN_DATE');
    expect(shown).not.toContain('BEAN_DATA_BEST_DATE');
  });

  it('spaces every criterion but the first of its group from the one above', async () => {
    await open();
    await openFurtherSorts();

    const spaced = items().map((each) =>
      each.classList.contains('ion-margin-top'),
    );
    expect(spaced.slice(0, 3)).toEqual([false, false, false]);
    expect(spaced.slice(3, 8)).toEqual([true, true, true, true, true]);
    expect(spaced[8]).toBeFalse();
    expect(spaced.slice(9).every(Boolean)).toBeTrue();
  });
});
