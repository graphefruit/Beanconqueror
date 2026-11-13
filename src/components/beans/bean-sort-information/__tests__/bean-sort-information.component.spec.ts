import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';

import { TranslateModule } from '@ngx-translate/core';

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
      field.dispatchEvent(new CustomEvent('ionInput'));
      fixture.detectChanges();
    }

    function suggestions(sortIndex: number): string[] {
      const items = sortCard(sortIndex).querySelectorAll('ion-list ion-item');
      return Array.from(items, (item) => item.textContent.trim());
    }

    it('should list the suggestions only in the sort typed into', () => {
      const field = countryField(1);
      field.dispatchEvent(new CustomEvent('ionFocus'));
      typeInto(field, 'eth');

      expect(suggestions(0)).toEqual([]);
      expect(suggestions(1)).toEqual(['Ethiopia']);
    });

    it('should fill a picked suggestion into the sort typed into', () => {
      const field = countryField(1);
      field.dispatchEvent(new CustomEvent('ionFocus'));
      typeInto(field, 'eth');

      // Picks the first suggestion the page shows, wherever that is.
      fixture.nativeElement.querySelector('ion-list ion-item').click();

      expect(component.data.bean_information[1].country).toBe('Ethiopia');
      expect(component.data.bean_information[0].country).toBeUndefined();
    });

    it('should keep suggesting in a sort after the same field of another sort was left', fakeAsync(() => {
      const first = countryField(0);
      first.dispatchEvent(new CustomEvent('ionFocus'));
      first.dispatchEvent(new CustomEvent('ionBlur'));
      const second = countryField(1);
      second.dispatchEvent(new CustomEvent('ionFocus'));
      tick(150);

      typeInto(second, 'eth');

      expect(suggestions(1)).toEqual(['Ethiopia']);
    }));
  });
});
