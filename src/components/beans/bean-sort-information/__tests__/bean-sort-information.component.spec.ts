import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import en from '../../../../assets/i18n/en.json';
import { Bean } from '../../../../classes/bean/bean';
import { Settings } from '../../../../classes/settings/settings';
import { BEAN_MIX_ENUM } from '../../../../enums/beans/mix';
import { IBeanInformation } from '../../../../interfaces/bean/iBeanInformation';
import { UIBeanHelper } from '../../../../services/uiBeanHelper';
import { UIBeanStorage } from '../../../../services/uiBeanStorage';
import { UIHelper } from '../../../../services/uiHelper';
import { UISettingsStorage } from '../../../../services/uiSettingsStorage';
import {
  createMockUIBeanHelper,
  createMockUISettingsStorage,
} from '../../../../test-utils';
import { BeanSortInformationComponent } from '../bean-sort-information.component';

describe('BeanSortInformationComponent', () => {
  let component: BeanSortInformationComponent;
  let fixture: ComponentFixture<BeanSortInformationComponent>;
  let settings: Settings;
  let mockUISettingsStorage: jasmine.SpyObj<any>;
  let mockUIBeanStorage: jasmine.SpyObj<UIBeanStorage>;

  beforeEach(waitForAsync(() => {
    settings = new Settings();
    mockUISettingsStorage = createMockUISettingsStorage();
    mockUISettingsStorage.getSettings.and.returnValue(settings);
    mockUIBeanStorage = jasmine.createSpyObj('UIBeanStorage', [
      'getAllEntries',
    ]);

    TestBed.configureTestingModule({
      imports: [BeanSortInformationComponent, TranslateModule.forRoot()],
      providers: [
        { provide: UISettingsStorage, useValue: mockUISettingsStorage },
        { provide: UIBeanHelper, useValue: createMockUIBeanHelper() },
        { provide: UIBeanStorage, useValue: mockUIBeanStorage },
        {
          provide: UIHelper,
          useValue: jasmine.createSpyObj('UIHelper', ['cloneData']),
        },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BeanSortInformationComponent);
    component = fixture.componentInstance;
  });

  function percentageFieldPresent(): boolean {
    const inputs = fixture.nativeElement.querySelectorAll('ion-input');
    return Array.from(inputs).some(
      (input: any) => input.label === 'BEAN_DATA_PERCENTAGE',
    );
  }

  function setBean(beanMix: BEAN_MIX_ENUM): void {
    const bean = new Bean();
    bean.beanMix = beanMix;
    bean.bean_information = [{} as IBeanInformation];
    component.data = bean;
    fixture.detectChanges();
  }

  describe('percentage field visibility', () => {
    it('should show percentage field when bean is BLEND and percentage setting is enabled', () => {
      settings.bean_manage_parameters.percentage = true;
      setBean('BLEND' as BEAN_MIX_ENUM);

      expect(percentageFieldPresent()).toBeTrue();
    });

    it('should hide percentage field when bean is SINGLE_ORIGIN', () => {
      settings.bean_manage_parameters.percentage = true;
      setBean('SINGLE_ORIGIN' as BEAN_MIX_ENUM);

      expect(percentageFieldPresent()).toBeFalse();
    });

    it('should hide percentage field when bean is BLEND but percentage setting is disabled', () => {
      settings.bean_manage_parameters.percentage = false;
      setBean('BLEND' as BEAN_MIX_ENUM);

      expect(percentageFieldPresent()).toBeFalse();
    });
  });

  describe('type-ahead suggestions of a blend', () => {
    beforeEach(() => {
      const storedBean = new Bean();
      storedBean.bean_information = [
        { country: 'Ethiopia' } as IBeanInformation,
      ];
      mockUIBeanStorage.getAllEntries.and.returnValue([storedBean]);

      const blend = new Bean();
      blend.beanMix = 'BLEND' as BEAN_MIX_ENUM;
      blend.bean_information = [{} as IBeanInformation, {} as IBeanInformation];
      component.data = blend;
      fixture.detectChanges();
    });

    function sortCard(sortIndex: number): HTMLElement {
      const host: HTMLElement = fixture.nativeElement;
      return host.querySelectorAll<HTMLElement>('ion-card')[sortIndex];
    }

    function countryField(sortIndex: number): any {
      const inputs = sortCard(sortIndex).querySelectorAll('ion-input');
      return Array.from(inputs).find(
        (input: any) => input.label === 'BEAN_DATA_COUNTRY',
      );
    }

    /** Types into a field the way ion-input reports it. */
    function typeInto(field: any, value: string): void {
      field.value = value;
      field.dispatchEvent(new CustomEvent('ionInput', { bubbles: true }));
      fixture.detectChanges();
    }

    function suggestions(sortIndex: number): string[] {
      const items = sortCard(sortIndex).querySelectorAll('[role="option"]');
      return Array.from(items, (item) => item.textContent.trim());
    }

    it('should list the suggestions only in the sort typed into', () => {
      const field = countryField(1);
      field.dispatchEvent(new CustomEvent('ionFocus', { bubbles: true }));
      typeInto(field, 'eth');

      expect(suggestions(0)).toEqual([]);
      expect(suggestions(1)).toEqual(['Ethiopia']);
    });

    it('should fill a picked suggestion into the sort typed into', () => {
      const field = countryField(1);
      field.dispatchEvent(new CustomEvent('ionFocus', { bubbles: true }));
      typeInto(field, 'eth');

      // Picks the first suggestion the page shows, wherever that is.
      fixture.nativeElement.querySelector('[role="option"]').click();

      expect(component.data.bean_information[1].country).toBe('Ethiopia');
      expect(component.data.bean_information[0].country).toBeUndefined();
    });

    it('should keep suggesting in a sort after the same field of another sort was left', fakeAsync(() => {
      const first = countryField(0);
      first.dispatchEvent(new CustomEvent('ionFocus', { bubbles: true }));
      first.dispatchEvent(new CustomEvent('ionBlur', { bubbles: true }));
      const second = countryField(1);
      second.dispatchEvent(new CustomEvent('ionFocus', { bubbles: true }));
      tick(150);

      typeInto(second, 'eth');

      expect(suggestions(1)).toEqual(['Ethiopia']);
    }));

    it('should suggest each value of a list once, at most eight', () => {
      const storedBean = new Bean();
      storedBean.bean_information = [
        { country: 'Kenya, Ethiopia; Rwanda' } as IBeanInformation,
        {
          country:
            'Kenya,Colombia, Costa Rica,Brazil,Peru,Panama,Bolivia,Guatemala',
        } as IBeanInformation,
      ];
      mockUIBeanStorage.getAllEntries.and.returnValue([storedBean]);
      const field = countryField(1);
      field.dispatchEvent(new CustomEvent('ionFocus', { bubbles: true }));

      typeInto(field, 'a');

      expect(suggestions(1)).toEqual([
        'Kenya',
        'Ethiopia',
        'Rwanda',
        'Colombia',
        'Costa Rica',
        'Brazil',
        'Panama',
        'Bolivia',
      ]);
    });
  });

  describe('the tools of a blend', () => {
    beforeEach(() => {
      settings.bean_manage_parameters.percentage = true;
      mockUIBeanStorage.getAllEntries.and.returnValue([]);
      (
        TestBed.inject(UIHelper) as jasmine.SpyObj<UIHelper>
      ).cloneData.and.callFake(<T>(value: T): T => structuredClone(value));
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('en', en);
      translate.use('en');
    });

    function element(): HTMLElement {
      return fixture.nativeElement as HTMLElement;
    }

    function buttons(name: string): HTMLElement[] {
      return Array.from(
        element().querySelectorAll<HTMLElement>(
          `ion-button[aria-label="${name}"]`,
        ),
      );
    }

    function addButton(): HTMLElement | undefined {
      return Array.from(
        element().querySelectorAll<HTMLElement>('ion-button'),
      ).find((button) => button.textContent.trim() === 'Add another bean type');
    }

    function headings(): string[] {
      return Array.from(
        element().querySelectorAll('[role="heading"]'),
        (heading) => heading.textContent.replace(/\s+/g, ' ').trim(),
      );
    }

    function show(beanMix: BEAN_MIX_ENUM, varieties: string[]): void {
      const bean = new Bean();
      bean.beanMix = beanMix;
      bean.bean_information = varieties.map(
        (country) => ({ country, percentage: 50 }) as IBeanInformation,
      );
      component.data = bean;
      fixture.detectChanges();
    }

    function percentages(): number {
      return Array.from(element().querySelectorAll('ion-input')).filter(
        (input) => input.label === 'Percentage',
      ).length;
    }

    function countries(): string[] {
      return component.data.bean_information.map(
        (information) => information.country,
      );
    }

    function click(button: HTMLElement): void {
      button.click();
      fixture.detectChanges();
    }

    it('gives a single origin bean one variety without the tools of a blend', () => {
      show('SINGLE_ORIGIN' as BEAN_MIX_ENUM, ['Kenya']);

      expect(element().querySelectorAll('ion-card').length).toBe(1);
      expect(headings()).toEqual(['Variety information']);
      expect(percentages()).toBe(0);
      expect(buttons('Copy variety information')).toEqual([]);
      expect(buttons('Delete variety')).toEqual([]);
      expect(addButton()).toBeUndefined();
    });

    it('numbers the varieties of a blend and keeps the only one from being deleted', () => {
      show('BLEND' as BEAN_MIX_ENUM, ['Kenya']);

      expect(headings()).toEqual(['1. Bean Type']);
      expect(percentages()).toBe(1);
      expect(buttons('Copy variety information').length).toBe(1);
      expect(buttons('Delete variety')).toEqual([]);
      expect(addButton()).toBeDefined();
    });

    it('adds an empty variety at the end, which can be deleted', () => {
      show('BLEND' as BEAN_MIX_ENUM, ['Kenya']);

      click(addButton());

      expect(countries()).toEqual(['Kenya', undefined]);
      expect(headings()).toEqual(['1. Bean Type', '2. Bean Type']);
      expect(percentages()).toBe(2);
      expect(buttons('Delete variety').length).toBe(1);
    });

    it('adds a copy of a variety at the end', () => {
      show('BLEND' as BEAN_MIX_ENUM, ['Kenya', 'Peru']);

      click(buttons('Copy variety information')[0]);

      expect(component.data.bean_information).toEqual([
        { country: 'Kenya', percentage: 50 },
        { country: 'Peru', percentage: 50 },
        { country: 'Kenya', percentage: 50 },
      ] as IBeanInformation[]);
      // A copy, so changing it leaves the first variety as it is.
      expect(component.data.bean_information[2]).not.toBe(
        component.data.bean_information[0],
      );
    });

    it('deletes the variety whose button was used, every one but the first', () => {
      show('BLEND' as BEAN_MIX_ENUM, ['Kenya', 'Peru', 'Kenya']);

      const remove = buttons('Delete variety');
      expect(remove.length).toBe(2);
      click(remove[0]);

      expect(countries()).toEqual(['Kenya', 'Kenya']);
    });
  });
});
